const Submission = require('../models/Submission');
const Assessment = require('../models/Assessment');

// @desc    Start the test for a student (set their timer start)
// @route   POST /api/submissions/:assessmentId/start
const startSubmitTest = async (req, res) => {
    try {
        const { assessmentId } = req.params;

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }
        if (assessment.status !== 'active') {
            return res.status(400).json({ message: 'Assessment is not currently active' });
        }

        // Check if student already started
        let submission = await Submission.findOne({
            studentId: req.user._id,
            assessmentId,
        });

        if (submission && submission.studentStartedAt) {
            // Already started, just return current submission
            return res.json({
                message: 'You already started this test',
                submission,
            });
        }

        // Create or update submission with student start time
        submission = await Submission.findOneAndUpdate(
            { studentId: req.user._id, assessmentId },
            {
                $set: {
                    studentStartedAt: new Date(),
                    totalQuestions: assessment.questions.length,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({
            message: 'Test started. You have ' + assessment.duration + ' minutes',
            submission,
            duration: assessment.duration,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get remaining time for a student's test
// @route   GET /api/submissions/:assessmentId/time-remaining
const getTimeRemaining = async (req, res) => {
    try {
        const { assessmentId } = req.params;

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const submission = await Submission.findOne({
            studentId: req.user._id,
            assessmentId,
        });

        if (!submission || !submission.studentStartedAt) {
            return res.status(400).json({
                message: 'Test not started yet',
                timeRemaining: 0,
            });
        }

        // Calculate time remaining
        const startTime = new Date(submission.studentStartedAt);
        const endTime = new Date(startTime.getTime() + assessment.duration * 60 * 1000);
        const now = new Date();
        const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000)); // in seconds

        // Check if time expired
        if (timeRemaining === 0 && !submission.submittedAt) {
            // Auto-submit if time expired
            submission.submittedAt = new Date();
            submission.isTimeExpired = true;
            await submission.save();
            
            return res.json({
                timeRemaining: 0,
                isExpired: true,
                message: 'Time is up! Test auto-submitted.',
                submission,
            });
        }

        res.json({
            timeRemaining,
            isExpired: timeRemaining === 0,
            duration: assessment.duration,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if student can submit (validate time)
const validateTimeBeforeSubmit = async (studentId, assessmentId) => {
    const assessment = await Assessment.findById(assessmentId);
    const submission = await Submission.findOne({
        studentId,
        assessmentId,
    });

    if (!submission || !submission.studentStartedAt) {
        throw new Error('Test not started');
    }

    const startTime = new Date(submission.studentStartedAt);
    const endTime = new Date(startTime.getTime() + assessment.duration * 60 * 1000);
    const now = new Date();

    if (now > endTime) {
        return { isExpired: true, timeOver: true };
    }

    return { isExpired: false };
};

// @desc    Submit or update answers (upsert)
// @route   POST /api/submissions
const submitAnswers = async (req, res) => {
    try {
        const { assessmentId, answers } = req.body;

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }
        if (assessment.status !== 'active') {
            return res.status(400).json({ message: 'Assessment is not currently active' });
        }

        // Validate time
        const timeCheck = await validateTimeBeforeSubmit(req.user._id, assessmentId);
        if (timeCheck.isExpired) {
            const existingSubmission = await Submission.findOne({
                studentId: req.user._id,
                assessmentId,
            });

            if (existingSubmission && existingSubmission.submittedAt) {
                return res.json({
                    message: 'Time is up. Your answers were already auto-submitted.',
                    isTimeExpired: true,
                    submission: existingSubmission,
                });
            }

            const autoSubmitted = await Submission.findOneAndUpdate(
                { studentId: req.user._id, assessmentId },
                {
                    $set: {
                        answers,
                        submittedAt: new Date(),
                        autoSaved: false,
                        isTimeExpired: true,
                        totalQuestions: assessment.questions.length,
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return res.json({
                message: 'Time is up! Answers auto-submitted.',
                isTimeExpired: true,
                submission: autoSubmitted,
            });
        }

        // Upsert: update if exists, create if not
        const submission = await Submission.findOneAndUpdate(
            { studentId: req.user._id, assessmentId },
            {
                $set: {
                    answers,
                    submittedAt: new Date(),
                    autoSaved: false,
                    totalQuestions: assessment.questions.length,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: 'Answers submitted successfully', submission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auto-save answers (partial save, no submittedAt)
// @route   PUT /api/submissions/autosave
const autoSaveAnswers = async (req, res) => {
    try {
        const { assessmentId, answers } = req.body;

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Check if time expired (don't allow autosave if time is up)
        try {
            const timeCheck = await validateTimeBeforeSubmit(req.user._id, assessmentId);
            if (timeCheck.isExpired) {
                return res.status(400).json({
                    message: 'Time is up! Cannot save answers.',
                    isTimeExpired: true,
                });
            }
        } catch (error) {
            // If test not started, allow autosave anyway
        }

        const submission = await Submission.findOneAndUpdate(
            { studentId: req.user._id, assessmentId },
            {
                $set: { answers, autoSaved: true },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: 'Answers auto-saved', submission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my submissions
// @route   GET /api/submissions/my
const getMySubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({ studentId: req.user._id })
            .populate('assessmentId', 'title status duration')
            .sort({ createdAt: -1 });
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all submissions for an assessment (admin)
// @route   GET /api/submissions/assessment/:assessmentId
const getSubmissionsByAssessment = async (req, res) => {
    try {
        const submissions = await Submission.find({ assessmentId: req.params.assessmentId })
            .populate('studentId', 'name email')
            .sort({ score: -1 });
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a specific submission with answer comparison
// @route   GET /api/submissions/:id
const getSubmissionDetail = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id)
            .populate('assessmentId')
            .populate('studentId', 'name email');

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Only allow student to see their own or admin to see any
        if (req.user.role === 'student' && submission.studentId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    startSubmitTest,
    getTimeRemaining,
    submitAnswers,
    autoSaveAnswers,
    getMySubmissions,
    getSubmissionsByAssessment,
    getSubmissionDetail,
};
