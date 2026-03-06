const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    answer: {
        type: String,
        default: '',
    },
    isCorrect: {
        type: Boolean,
        default: null, // null until evaluated, true/false after evaluation
    },
});

const submissionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    assessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true,
    },
    answers: [answerSchema],
    score: {
        type: Number,
        default: null, // null until evaluated
    },
    totalQuestions: {
        type: Number,
        default: 0,
    },
    studentStartedAt: {
        type: Date,
        default: null, // When the student starts taking the test
    },
    submittedAt: {
        type: Date,
        default: null,
    },
    isTimeExpired: {
        type: Boolean,
        default: false, // true if auto-submitted due to time expiry
    },
    autoSaved: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Compound unique index: one submission per student per assessment
submissionSchema.index({ studentId: 1, assessmentId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
