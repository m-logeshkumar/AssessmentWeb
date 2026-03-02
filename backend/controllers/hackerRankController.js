const HackerRankScore = require('../models/HackerRankScore');
const User = require('../models/User');
const { parse } = require('csv-parse/sync');

// @desc    Manually enter HackerRank score for a student
// @route   POST /api/hackerrank/manual
const manualEntry = async (req, res) => {
    try {
        const { studentId, testName, score, maxScore } = req.body;

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        const hrScore = await HackerRankScore.create({
            studentId,
            testName,
            score,
            maxScore,
        });

        res.status(201).json(hrScore);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Import HackerRank scores from CSV
// @route   POST /api/hackerrank/import-csv
const importCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No CSV file uploaded' });
        }

        const csvContent = req.file.buffer.toString('utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        const results = { imported: 0, skipped: 0, errors: [] };

        for (const record of records) {
            try {
                // Expected CSV columns: email, testName, score, maxScore
                const student = await User.findOne({ email: record.email, role: 'student' });
                if (!student) {
                    results.skipped++;
                    results.errors.push(`Student not found: ${record.email}`);
                    continue;
                }

                await HackerRankScore.create({
                    studentId: student._id,
                    testName: record.testName || record.test_name || 'HackerRank Test',
                    score: parseFloat(record.score) || 0,
                    maxScore: parseFloat(record.maxScore || record.max_score) || 100,
                });

                results.imported++;
            } catch (err) {
                results.skipped++;
                results.errors.push(`Error for ${record.email}: ${err.message}`);
            }
        }

        res.json({
            message: `Import complete: ${results.imported} imported, ${results.skipped} skipped`,
            results,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Import HackerRank scores from JSON
// @route   POST /api/hackerrank/import-json
const importJSON = async (req, res) => {
    try {
        const { scores } = req.body; // array of { email, testName, score, maxScore }

        if (!scores || !Array.isArray(scores)) {
            return res.status(400).json({ message: 'Invalid JSON format. Expected { scores: [...] }' });
        }

        const results = { imported: 0, skipped: 0, errors: [] };

        for (const record of scores) {
            try {
                const student = await User.findOne({ email: record.email, role: 'student' });
                if (!student) {
                    results.skipped++;
                    results.errors.push(`Student not found: ${record.email}`);
                    continue;
                }

                await HackerRankScore.create({
                    studentId: student._id,
                    testName: record.testName || 'HackerRank Test',
                    score: record.score || 0,
                    maxScore: record.maxScore || 100,
                });

                results.imported++;
            } catch (err) {
                results.skipped++;
                results.errors.push(`Error for ${record.email}: ${err.message}`);
            }
        }

        res.json({
            message: `Import complete: ${results.imported} imported, ${results.skipped} skipped`,
            results,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get HackerRank scores for a student
// @route   GET /api/hackerrank/student/:studentId
const getScoresByStudent = async (req, res) => {
    try {
        const scores = await HackerRankScore.find({ studentId: req.params.studentId })
            .sort({ importedAt: -1 });
        res.json(scores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a HackerRank score
// @route   DELETE /api/hackerrank/:id
const deleteScore = async (req, res) => {
    try {
        await HackerRankScore.findByIdAndDelete(req.params.id);
        res.json({ message: 'Score deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { manualEntry, importCSV, importJSON, getScoresByStudent, deleteScore };
