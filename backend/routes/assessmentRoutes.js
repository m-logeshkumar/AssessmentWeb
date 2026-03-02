const express = require('express');
const router = express.Router();
const {
    createAssessment,
    getAssessments,
    getAssessmentById,
    startAssessment,
    stopAssessment,
    publishResults,
    aiPublishResults,
    deleteAssessment,
} = require('../controllers/assessmentController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, getAssessments);
router.get('/:id', protect, getAssessmentById);
router.post('/', protect, isAdmin, createAssessment);
router.put('/:id/start', protect, isAdmin, startAssessment);
router.put('/:id/stop', protect, isAdmin, stopAssessment);
router.put('/:id/publish', protect, isAdmin, publishResults);
router.put('/:id/ai-evaluate', protect, isAdmin, aiPublishResults);
router.delete('/:id', protect, isAdmin, deleteAssessment);

module.exports = router;
