const express = require('express');
const router = express.Router();
const { getStudentScores, getLeaderboard } = require('../controllers/scoreController');
const { protect } = require('../middleware/authMiddleware');

router.get('/student/:studentId', protect, getStudentScores);
router.get('/leaderboard', protect, getLeaderboard);

module.exports = router;
