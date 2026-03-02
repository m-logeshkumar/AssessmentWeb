const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const hackerRankRoutes = require('./routes/hackerRankRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/hackerrank', hackerRankRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

// Start server FIRST, then connect to DB
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Attempt DB connection in the background
    connectDB().then((connected) => {
        if (connected) {
            console.log('✅ Database ready — all APIs are functional');
        } else {
            console.log('⚠️  Running without database — DB-dependent APIs will return errors');
        }
    });
});
