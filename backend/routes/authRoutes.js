const express = require('express');
const router = express.Router();
const { register, login, getMe, getStudents, deleteUser } = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/students', protect, isAdmin, getStudents);
router.delete('/users/:userId', protect, isAdmin, deleteUser);

module.exports = router;
