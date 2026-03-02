import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { HiOutlineCheck, HiOutlineArrowLeft } from 'react-icons/hi';

const EvaluateTest = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [aiEvaluating, setAiEvaluating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assessRes, subRes] = await Promise.all([
                    axios.get(`/assessments/${id}`),
                    axios.get(`/submissions/assessment/${id}`),
                ]);
                setAssessment(assessRes.data);
                setSubmissions(subRes.data);

                // Initialize answers array
                const initialAnswers = assessRes.data.questions.map(q => ({
                    questionId: q._id,
                    correctAnswer: q.correctAnswer || '',
                }));
                setAnswers(initialAnswers);
            } catch (err) {
                toast.error('Failed to load assessment');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const updateAnswer = (index, value) => {
        const updated = [...answers];
        updated[index].correctAnswer = value;
        setAnswers(updated);
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            const result = await axios.put(`/assessments/${id}/publish`, { answers });
            toast.success(`Results published! ${result.data.evaluatedCount} submissions evaluated.`);
            navigate('/admin/assessments');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to publish');
        } finally {
            setPublishing(false);
        }
    };

    const handleAIEvaluate = async () => {
        setAiEvaluating(true);
        try {
            const result = await axios.put(`/assessments/${id}/ai-evaluate`);
            toast.success(result.data.message);

            // Update the answers UI with Gemini's correct answers
            if (result.data.evaluations) {
                const updated = [...answers];
                for (const ev of result.data.evaluations) {
                    if (updated[ev.questionIndex]) {
                        updated[ev.questionIndex].correctAnswer = ev.correctAnswer;
                    }
                }
                setAnswers(updated);
            }

            // Refresh submissions to show scores
            const { data: freshSubs } = await axios.get(`/submissions/assessment/${id}`);
            setSubmissions(freshSubs);
        } catch (err) {
            toast.error(err.response?.data?.message || 'AI evaluation failed');
        } finally {
            setAiEvaluating(false);
        }
    };

    if (loading) return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Evaluate Test" />
                <div className="page-container">
                    <div className="empty-state">Loading...</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Evaluate Test" />
                <div className="page-container">
                    <div className="page-header">
                        <div>
                            <button
                                className="btn btn-secondary btn-sm mb-16"
                                onClick={() => navigate('/admin/assessments')}
                            >
                                <HiOutlineArrowLeft /> Back
                            </button>
                            <h2 className="page-title">{assessment?.title}</h2>
                            <p className="page-description">
                                Input the correct answers for each question, then publish results
                            </p>
                        </div>
                        <div className="flex gap-12 items-center">
                            <span className="badge badge-completed">
                                {submissions.length} Submissions
                            </span>
                        </div>
                    </div>

                    {/* Answer Key Input */}
                    <div className="card mb-24">
                        <div className="card-header">
                            <h3 className="card-title">Answer Key</h3>
                            <p className="card-subtitle">Enter the correct answer for each fillup question</p>
                        </div>
                        {assessment?.questions?.map((q, i) => (
                            <div key={q._id} className="question-item">
                                <div className="question-number">Question {i + 1}</div>
                                <div className="question-text">{q.questionText}</div>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter correct answer..."
                                    value={answers[i]?.correctAnswer || ''}
                                    onChange={(e) => updateAnswer(i, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Submissions Preview */}
                    {submissions.length > 0 && (
                        <div className="card mb-24">
                            <div className="card-header">
                                <h3 className="card-title">Submissions</h3>
                            </div>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Email</th>
                                            <th>Submitted At</th>
                                            <th>Auto-saved</th>
                                            <th>Current Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map(s => (
                                            <tr key={s._id}>
                                                <td style={{ fontWeight: 600 }}>{s.studentId?.name}</td>
                                                <td>{s.studentId?.email}</td>
                                                <td>{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}</td>
                                                <td>
                                                    <span className={`badge ${s.autoSaved ? 'badge-active' : 'badge-draft'}`}>
                                                        {s.autoSaved ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td>{s.score !== null ? `${s.score}/${s.totalQuestions}` : 'Pending'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-12" style={{ marginBottom: 24 }}>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleAIEvaluate}
                            disabled={aiEvaluating || publishing}
                            style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
                                boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                            }}
                        >
                            {aiEvaluating ? '🤖 Gemini is evaluating...' : '🤖 AI Auto-Evaluate with Gemini'}
                        </button>
                        <button
                            className="btn btn-success btn-lg"
                            onClick={handlePublish}
                            disabled={publishing || aiEvaluating}
                            style={{ flex: 1 }}
                        >
                            <HiOutlineCheck />
                            {publishing ? 'Publishing...' : 'Manual Publish'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluateTest;
