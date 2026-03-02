const Submission = require('../models/Submission');
const HackerRankScore = require('../models/HackerRankScore');
const User = require('../models/User');

// @desc    Get aggregated scores for a student
// @route   GET /api/scores/student/:studentId
const getStudentScores = async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Get internal test scores
        const submissions = await Submission.find({
            studentId,
            score: { $ne: null },
        }).populate('assessmentId', 'title duration');

        // Get HackerRank scores
        const hackerRankScores = await HackerRankScore.find({ studentId });

        // Calculate aggregates
        const internalTotal = submissions.reduce((sum, s) => sum + (s.score || 0), 0);
        const internalMax = submissions.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);
        const hackerRankTotal = hackerRankScores.reduce((sum, s) => sum + s.score, 0);
        const hackerRankMax = hackerRankScores.reduce((sum, s) => sum + s.maxScore, 0);

        res.json({
            studentId,
            internal: {
                submissions: submissions.map(s => ({
                    submissionId: s._id,
                    assessmentTitle: s.assessmentId?.title || 'Unknown',
                    score: s.score,
                    totalQuestions: s.totalQuestions,
                    submittedAt: s.submittedAt,
                })),
                total: internalTotal,
                maxTotal: internalMax,
            },
            hackerRank: {
                scores: hackerRankScores,
                total: hackerRankTotal,
                maxTotal: hackerRankMax,
            },
            aggregate: {
                totalScore: internalTotal + hackerRankTotal,
                maxScore: internalMax + hackerRankMax,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get leaderboard — all students sorted by combined score
// @route   GET /api/scores/leaderboard
const getLeaderboard = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('name email');
        const leaderboard = [];

        for (const student of students) {
            const submissions = await Submission.find({
                studentId: student._id,
                score: { $ne: null },
            });

            const hackerRankScores = await HackerRankScore.find({ studentId: student._id });

            const internalTotal = submissions.reduce((sum, s) => sum + (s.score || 0), 0);
            const internalMax = submissions.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);
            const hackerRankTotal = hackerRankScores.reduce((sum, s) => sum + s.score, 0);
            const hackerRankMax = hackerRankScores.reduce((sum, s) => sum + s.maxScore, 0);

            leaderboard.push({
                student: { _id: student._id, name: student.name, email: student.email },
                internalScore: internalTotal,
                internalMax: internalMax,
                hackerRankScore: hackerRankTotal,
                hackerRankMax: hackerRankMax,
                totalScore: internalTotal + hackerRankTotal,
                maxScore: internalMax + hackerRankMax,
                testsAttempted: submissions.length,
                hackerRankTests: hackerRankScores.length,
            });
        }

        // Sort descending by total score
        leaderboard.sort((a, b) => b.totalScore - a.totalScore);

        // Assign ranks
        leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getStudentScores, getLeaderboard };
