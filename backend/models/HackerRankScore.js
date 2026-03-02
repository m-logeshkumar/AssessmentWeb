const mongoose = require('mongoose');

const hackerRankScoreSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    testName: {
        type: String,
        required: [true, 'Test name is required'],
        trim: true,
    },
    score: {
        type: Number,
        required: [true, 'Score is required'],
        min: 0,
    },
    maxScore: {
        type: Number,
        required: [true, 'Max score is required'],
        min: 1,
    },
    importedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

module.exports = mongoose.model('HackerRankScore', hackerRankScoreSchema);
