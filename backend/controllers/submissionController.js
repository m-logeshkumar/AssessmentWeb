const Submission = require('../models/Submission');
const Assessment = require('../models/Assessment');

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
    submitAnswers,
    autoSaveAnswers,
    getMySubmissions,
    getSubmissionsByAssessment,
    getSubmissionDetail,
};
