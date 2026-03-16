const Assessment = require('../models/Assessment');
const Submission = require('../models/Submission');
const { cancelAssessmentTimer } = require('../middleware/timerMiddleware');
const { evaluateWithGemini, applyGeminiScores } = require('../utils/geminiEvaluator');

// @desc    Create a new assessment
// @route   POST /api/assessments
const createAssessment = async (req, res) => {
    try {
        const { title, questions, duration } = req.body;

        const assessment = await Assessment.create({
            title,
            questions: questions.map(q => ({
                questionText: q.questionText,
                type: 'fillup',
                correctAnswer: '', // will be set after exam
            })),
            duration,
            createdBy: req.user._id,
        });

        res.status(201).json(assessment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all assessments
// @route   GET /api/assessments
const getAssessments = async (req, res) => {
    try {
        const assessments = await Assessment.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(assessments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single assessment
// @route   GET /api/assessments/:id
const getAssessmentById = async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id)
            .populate('createdBy', 'name email');
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // If student, don't reveal correct answers
        if (req.user.role === 'student') {
            const sanitized = assessment.toObject();
            sanitized.questions = sanitized.questions.map(q => ({
                ...q,
                correctAnswer: undefined,
            }));
            return res.json(sanitized);
        }

        res.json(assessment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Start an assessment (set active; admin stops manually)
// @route   PUT /api/assessments/:id/start
const startAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (assessment.status === 'active') {
            return res.status(400).json({ message: 'Assessment is already active' });
        }

        assessment.status = 'active';
        assessment.startedAt = new Date();
        await assessment.save();

        res.json({ message: 'Assessment started', assessment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Stop an assessment manually
// @route   PUT /api/assessments/:id/stop
const stopAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        assessment.status = 'completed';
        await assessment.save();

        cancelAssessmentTimer(assessment._id);

        // Keep pending attempts as not-submitted; only mark draft presence.
        await Submission.updateMany(
            { assessmentId: assessment._id, submittedAt: null },
            { $set: { autoSaved: true } }
        );

        res.json({ message: 'Assessment stopped', assessment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Publish results — admin inputs correct answers & batch evaluate
// @route   PUT /api/assessments/:id/publish
const publishResults = async (req, res) => {
    try {
        const { answers } = req.body; // array of { questionId, correctAnswer }
        const assessment = await Assessment.findById(req.params.id);

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (assessment.status !== 'completed') {
            return res.status(400).json({
                message: 'Stop the assessment first. Admin must manually stop before publishing results.',
            });
        }

        // Update correct answers in the assessment
        for (const ans of answers) {
            const question = assessment.questions.id(ans.questionId);
            if (question) {
                question.correctAnswer = ans.correctAnswer;
            }
        }
        await assessment.save();

        // Batch evaluate all submissions for this assessment
        const submissions = await Submission.find({ assessmentId: assessment._id });

        // Helper to check Java primitive/wrapper equivalence
        const areJavaTypeEquivalents = (answer1, answer2) => {
            const primitiveWrapperMap = {
                'int': 'integer', 'integer': 'int',
                'double': 'double', 'float': 'float', 'long': 'long',
                'short': 'short', 'byte': 'byte',
                'char': 'character', 'character': 'char',
                'boolean': 'boolean'
            };
            const lower1 = answer1.toLowerCase();
            const lower2 = answer2.toLowerCase();
            if (lower1 === lower2) return true;
            return primitiveWrapperMap[lower1] === lower2;
        };

        for (const submission of submissions) {
            let score = 0;
            const totalQuestions = assessment.questions.length;

            for (const studentAnswer of submission.answers) {
                const question = assessment.questions.id(studentAnswer.questionId);
                if (question && question.correctAnswer) {
                    const studentAns = studentAnswer.answer.trim();
                    const correctAns = question.correctAnswer.trim();
                    
                    // Check: case-insensitive match OR Java type equivalence
                    const isCorrect = studentAns.toLowerCase() === correctAns.toLowerCase() ||
                                    areJavaTypeEquivalents(studentAns, correctAns);
                    
                    studentAnswer.isCorrect = isCorrect;
                    if (isCorrect) {
                        score++;
                    }
                }
            }

            submission.score = score;
            submission.totalQuestions = totalQuestions;
            await submission.save();
        }

        res.json({
            message: 'Results published and scores evaluated (1 mark per question)',
            evaluatedCount: submissions.length,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    AI-powered evaluation using Gemini
// @route   PUT /api/assessments/:id/ai-evaluate
const aiPublishResults = async (req, res) => {
    try {
        // Validate input
        const assessmentId = req.params.id;
        if (!assessmentId) {
            return res.status(400).json({ message: 'Assessment ID is required' });
        }

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (assessment.status !== 'completed') {
            return res.status(400).json({
                message: 'Stop the assessment first. Admin must manually stop before AI evaluation.',
            });
        }

        if (!assessment.questions || assessment.questions.length === 0) {
            return res.status(400).json({ message: 'Assessment has no questions' });
        }

        const submissions = await Submission.find({ assessmentId: assessment._id });
        if (submissions.length === 0) {
            return res.status(400).json({ message: 'No submissions to evaluate' });
        }

        console.log(`🤖 Starting Gemini AI evaluation for "${assessment.title}" (${submissions.length} submissions)...`);

        let evaluations;
        try {
            // Call Gemini to evaluate with built-in retry logic
            evaluations = await evaluateWithGemini(assessment, submissions);
        } catch (geminiError) {
            console.error('❌ Gemini API error:', geminiError.message);
            
            // More specific error messages
            if (geminiError.message.includes('429') || geminiError.message.includes('RESOURCE_EXHAUSTED')) {
                return res.status(429).json({ 
                    message: 'API quota exceeded. Please upgrade your Gemini API plan or try again later.',
                    error: geminiError.message 
                });
            }
            if (geminiError.message.includes('401') || geminiError.message.includes('UNAUTHENTICATED')) {
                return res.status(401).json({ 
                    message: 'Invalid Gemini API key. Please check your .env file.',
                    error: geminiError.message 
                });
            }
            throw geminiError;
        }

        if (!evaluations || evaluations.length === 0) {
            return res.status(400).json({ message: 'No evaluations returned from Gemini' });
        }

        // Apply scores with error handling
        let results;
        try {
            results = applyGeminiScores(assessment, submissions, evaluations);
        } catch (scoreError) {
            console.error('❌ Score application error:', scoreError.message);
            return res.status(400).json({ 
                message: 'Failed to apply scores',
                error: scoreError.message 
            });
        }

        // Update correct answers and descriptions on the assessment
        for (const evaluation of evaluations) {
            if (typeof evaluation.questionIndex === 'number' && evaluation.questionIndex >= 0) {
                const question = assessment.questions[evaluation.questionIndex];
                if (question && typeof evaluation.correctAnswer === 'string') {
                    question.correctAnswer = evaluation.correctAnswer;
                    if (typeof evaluation.answerDescription === 'string') {
                        question.answerDescription = evaluation.answerDescription;
                    }
                }
            }
        }
        await assessment.save();

        // Save scores and per-question results to submissions
        const updatePromises = results.map(async (result) => {
            const submission = await Submission.findById(result.submissionId);
            if (!submission) return;

            // Update per-question isCorrect flags
            for (const detail of result.detailedScores) {
                const question = assessment.questions[detail.questionIndex];
                if (question) {
                    const answer = submission.answers.find(
                        a => a.questionId.toString() === question._id.toString()
                    );
                    if (answer) {
                        answer.isCorrect = detail.isCorrect;
                    }
                }
            }

            submission.score = result.score;
            submission.totalQuestions = result.totalQuestions;
            await submission.save();
        });
        await Promise.all(updatePromises);

        console.log(`✅ Gemini evaluation complete: ${results.length} submissions scored`);

        res.json({
            message: `AI evaluation complete! ${results.length} submissions scored by Gemini`,
            evaluatedCount: results.length,
            evaluations: evaluations.map(e => ({
                questionIndex: e.questionIndex,
                correctAnswer: e.correctAnswer,
                answerCount: Object.keys(e.answers).length,
            })),
            scores: results.map(r => ({
                submissionId: r.submissionId,
                score: r.score,
                totalQuestions: r.totalQuestions,
                maxMarks: r.maxMarks,
                percentage: ((r.score / r.maxMarks) * 100).toFixed(2) + '%',
            })),
        });
    } catch (error) {
        console.error('❌ Gemini evaluation error:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            message: `AI evaluation failed: ${error.message}`,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Delete an assessment
// @route   DELETE /api/assessments/:id
const deleteAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findByIdAndDelete(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }
        // Also remove related submissions
        await Submission.deleteMany({ assessmentId: req.params.id });
        cancelAssessmentTimer(req.params.id);
        res.json({ message: 'Assessment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAssessment,
    getAssessments,
    getAssessmentById,
    startAssessment,
    stopAssessment,
    publishResults,
    aiPublishResults,
    deleteAssessment,
};
