import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { HiOutlineClock, HiOutlineSave } from 'react-icons/hi';

const TakeTest = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const timerRef = useRef(null);
    const autoSaveRef = useRef(null);
    const hasExpiredRef = useRef(false);

    useEffect(() => {
        const fetchAssessment = async () => {
            try {
                const { data } = await axios.get(`/assessments/${id}`);
                if (data.status !== 'active') {
                    toast.error('This assessment is not currently active');
                    navigate('/student/tests');
                    return;
                }
                setAssessment(data);

                // Start the test for this student (set their timer)
                try {
                    await axios.post(`/submissions/${id}/start`);
                } catch (err) {
                    if (err.response?.status !== 400) {
                        console.error('Failed to start test:', err);
                    }
                }

                // Load any existing auto-saved answers
                try {
                    const { data: subs } = await axios.get('/submissions/my');
                    const existing = subs.find(s => s.assessmentId?._id === id || s.assessmentId === id);
                    if (existing && existing.answers) {
                        const saved = {};
                        existing.answers.forEach(a => { saved[a.questionId] = a.answer; });
                        setAnswers(saved);
                    }
                } catch { }
            } catch (err) {
                toast.error('Failed to load assessment');
                navigate('/student/tests');
            } finally {
                setLoading(false);
            }
        };
        fetchAssessment();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);
        };
    }, [id, navigate]);

    // Fetch remaining time and update timer every second
    useEffect(() => {
        if (!assessment) return;

        const fetchTimeRemaining = async () => {
            try {
                const { data } = await axios.get(`/submissions/${id}/time-remaining`);
                const remaining = data.timeRemaining || 0;
                setTimeLeft(remaining);

                if (data.isExpired && !hasExpiredRef.current) {
                    hasExpiredRef.current = true;
                    clearInterval(timerRef.current);
                    clearInterval(autoSaveRef.current);
                    toast.success('Time is up! Answers auto-submitted.');
                    navigate('/student/scores');
                }
            } catch (err) {
                // Assessment might not be started yet or has ended
                console.error('Error fetching time:', err);
            }
        };

        fetchTimeRemaining(); // Fetch immediately
        timerRef.current = setInterval(fetchTimeRemaining, 1000); // Then every second

        return () => clearInterval(timerRef.current);
    }, [assessment, id, navigate]);

    // Auto-save every 30 seconds
    useEffect(() => {
        if (!assessment) return;

        autoSaveRef.current = setInterval(() => {
            autoSave();
        }, 30000);

        return () => clearInterval(autoSaveRef.current);
    }, [assessment, answers]);

    const autoSave = useCallback(async () => {
        if (!assessment) return;
        try {
            const answerArray = assessment.questions.map(q => ({
                questionId: q._id,
                answer: answers[q._id] || '',
            }));
            await axios.put('/submissions/autosave', {
                assessmentId: id,
                answers: answerArray,
            });
        } catch { }
    }, [assessment, answers, id]);

    const handleSubmit = async (auto = false) => {
        setSubmitting(true);
        try {
            const answerArray = assessment.questions.map(q => ({
                questionId: q._id,
                answer: answers[q._id] || '',
            }));
            await axios.post('/submissions', {
                assessmentId: id,
                answers: answerArray,
            });
            toast.success(auto ? 'Answers auto-submitted!' : 'Answers submitted successfully!');
            navigate('/student/scores');
        } catch (err) {
            if (err.response?.data?.isTimeExpired) {
                toast.success('Time is up! Answers auto-submitted.');
                navigate('/student/scores');
                return;
            }
            toast.error('Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Take Test" />
                <div className="page-container">
                    <div className="empty-state">Loading assessment...</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title={assessment?.title || 'Take Test'} />
                <div className="page-container">
                    <div className="page-header">
                        <div>
                            <h2 className="page-title">{assessment?.title}</h2>
                            <p className="page-description">
                                {assessment?.questions?.length} questions • Fill in the blanks
                            </p>
                        </div>
                        <div className="flex gap-12 items-center">
                            <div className={`timer-display ${timeLeft < 60 ? 'warning' : ''}`}>
                                <HiOutlineClock />
                                {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                            </div>
                        </div>
                    </div>

                    {/* Questions */}
                    {assessment?.questions?.map((q, i) => (
                        <div key={q._id} className="question-item" style={{ marginBottom: 16 }}>
                            <div className="question-number">Question {i + 1}</div>
                            <div className="question-text">{q.questionText}</div>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Type your answer..."
                                value={answers[q._id] || ''}
                                onChange={(e) =>
                                    setAnswers({ ...answers, [q._id]: e.target.value })
                                }
                            />
                        </div>
                    ))}

                    {/* Submit */}
                    <div className="flex gap-12 mt-24">
                        <button
                            className="btn btn-secondary"
                            onClick={autoSave}
                        >
                            <HiOutlineSave /> Save Progress
                        </button>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                            style={{ flex: 1 }}
                        >
                            {submitting ? 'Submitting...' : 'Submit Answers'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeTest;
