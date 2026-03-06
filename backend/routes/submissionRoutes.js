const express = require('express');
const router = express.Router();
const {
    startSubmitTest,
    getTimeRemaining,
    submitAnswers,
    autoSaveAnswers,
    getMySubmissions,
    getSubmissionsByAssessment,
    getSubmissionDetail,
} = require('../controllers/submissionController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.post('/:assessmentId/start', protect, startSubmitTest);
router.get('/:assessmentId/time-remaining', protect, getTimeRemaining);
router.post('/', protect, submitAnswers);
router.put('/autosave', protect, autoSaveAnswers);
router.get('/my', protect, getMySubmissions);
router.get('/assessment/:assessmentId', protect, isAdmin, getSubmissionsByAssessment);
router.get('/:id', protect, getSubmissionDetail);

module.exports = router;
