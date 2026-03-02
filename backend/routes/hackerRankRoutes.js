const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    manualEntry,
    importCSV,
    importJSON,
    getScoresByStudent,
    deleteScore,
} = require('../controllers/hackerRankController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Multer setup for CSV upload (in-memory)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/manual', protect, isAdmin, manualEntry);
router.post('/import-csv', protect, isAdmin, upload.single('file'), importCSV);
router.post('/import-json', protect, isAdmin, importJSON);
router.get('/student/:studentId', protect, getScoresByStudent);
router.delete('/:id', protect, isAdmin, deleteScore);

module.exports = router;
