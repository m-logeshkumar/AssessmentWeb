/**
 * Assessment-level timers are intentionally disabled.
 * Admin controls when to stop the assessment manually.
 */
const startAssessmentTimer = (assessmentId, durationMinutes) => {
    console.log(
        `ℹ️ Assessment timer is disabled (manual-stop mode): ${assessmentId}, duration ${durationMinutes} minutes`
    );
};

/**
 * Legacy helper kept for compatibility.
 */
const getRemainingTime = () => false;

/**
 * Legacy helper kept for compatibility.
 */
const cancelAssessmentTimer = (assessmentId) => {
    console.log(`ℹ️ No assessment timer to cancel (manual-stop mode): ${assessmentId}`);
};

module.exports = { startAssessmentTimer, getRemainingTime, cancelAssessmentTimer };
