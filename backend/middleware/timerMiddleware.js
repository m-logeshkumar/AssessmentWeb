const Submission = require('../models/Submission');
const Assessment = require('../models/Assessment');

// In-memory store for active assessment timers
const activeTimers = new Map();

/**
 * Start a timer for an assessment. When the timer expires,
 * all in-progress submissions are auto-saved.
 */
const startAssessmentTimer = (assessmentId, durationMinutes) => {
    // Clear any existing timer for this assessment
    if (activeTimers.has(assessmentId.toString())) {
        clearTimeout(activeTimers.get(assessmentId.toString()));
    }

    const durationMs = durationMinutes * 60 * 1000;

    const timerId = setTimeout(async () => {
        try {
            console.log(`⏰ Timer expired for assessment ${assessmentId}. Auto-saving submissions...`);

            // Mark assessment as completed
            await Assessment.findByIdAndUpdate(assessmentId, { status: 'completed' });

            // Auto-save all submissions that haven't been formally submitted
            await Submission.updateMany(
                { assessmentId, submittedAt: null },
                { $set: { autoSaved: true, submittedAt: new Date() } }
            );

            activeTimers.delete(assessmentId.toString());
            console.log(`✅ Auto-save complete for assessment ${assessmentId}`);
        } catch (error) {
            console.error(`❌ Auto-save failed for assessment ${assessmentId}:`, error.message);
        }
    }, durationMs);

    activeTimers.set(assessmentId.toString(), timerId);
    console.log(`⏳ Timer started for assessment ${assessmentId}: ${durationMinutes} minutes`);
};

/**
 * Get remaining time for an active assessment
 */
const getRemainingTime = (assessmentId) => {
    return activeTimers.has(assessmentId.toString());
};

/**
 * Cancel a timer for an assessment
 */
const cancelAssessmentTimer = (assessmentId) => {
    if (activeTimers.has(assessmentId.toString())) {
        clearTimeout(activeTimers.get(assessmentId.toString()));
        activeTimers.delete(assessmentId.toString());
        console.log(`🛑 Timer cancelled for assessment ${assessmentId}`);
    }
};

module.exports = { startAssessmentTimer, getRemainingTime, cancelAssessmentTimer };
