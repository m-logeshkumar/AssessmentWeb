const express = require('express');
const router = express.Router();
const {
    submitAnswers,
    autoSaveAnswers,
    getMySubmissions,
    getSubmissionsByAssessment,
    getSubmissionDetail,
} = require('../controllers/submissionController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.post('/', protect, submitAnswers);
router.put('/autosave', protect, autoSaveAnswers);
router.get('/my', protect, getMySubmissions);
router.get('/assessment/:assessmentId', protect, isAdmin, getSubmissionsByAssessment);
router.get('/:id', protect, getSubmissionDetail);

module.exports = router;
