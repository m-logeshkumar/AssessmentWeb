const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
    },
    type: {
        type: String,
        enum: ['fillup'],
        default: 'fillup',
    },
    correctAnswer: {
        type: String,
        default: '', // Admin fills this AFTER the test
    },
    answerDescription: {
        type: String,
        default: '', // Optional explanation for the answer
    },
});

const assessmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Assessment title is required'],
        trim: true,
    },
    questions: [questionSchema],
    duration: {
        type: Number, // in minutes
        required: [true, 'Duration is required'],
        min: 1,
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'completed'],
        default: 'draft',
    },
    startedAt: {
        type: Date,
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
