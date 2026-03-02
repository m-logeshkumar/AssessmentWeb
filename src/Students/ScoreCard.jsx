import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { HiOutlineCheck, HiOutlineX, HiOutlineArrowLeft } from 'react-icons/hi';

const ScoreCard = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const { data } = await axios.get(`/submissions/${submissionId}`);
                setSubmission(data);
            } catch (err) {
                toast.error('Failed to load submission details');
            } finally {
                setLoading(false);
            }
        };
        fetchSubmission();
    }, [submissionId]);

    if (loading) return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Score Card" />
                <div className="page-container">
                    <div className="empty-state">Loading...</div>
                </div>
            </div>
        </div>
    );

    const assessment = submission?.assessmentId;
    const studentAnswers = submission?.answers || [];

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Score Card" />
                <div className="page-container">
                    <button
                        className="btn btn-secondary btn-sm mb-16"
                        onClick={() => navigate(-1)}
                    >
                        <HiOutlineArrowLeft /> Back
                    </button>

                    <div className="page-header">
                        <div>
                            <h2 className="page-title">{assessment?.title || 'Assessment'}</h2>
                            <p className="page-description">
                                Score: <strong>{submission?.score ?? '—'}</strong> / {submission?.totalQuestions || assessment?.questions?.length || 0}
                            </p>
                        </div>
                        <div>
                            {submission?.score !== null && submission?.totalQuestions > 0 && (
                                <div style={{
                                    fontSize: 40,
                                    fontWeight: 800,
                                    background: 'var(--accent-gradient)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}>
                                    {Math.round((submission.score / submission.totalQuestions) * 100)}%
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Answer Comparison */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Answer Comparison</h3>
                            <p className="card-subtitle">Your answers vs correct answers</p>
                        </div>
                        <div className="score-comparison">
                            {assessment?.questions?.map((q, i) => {
                                const studentAns = studentAnswers.find(a => a.questionId === q._id);
                                const hasCorrectAnswer = q.correctAnswer && q.correctAnswer.length > 0;
                                // Use backend evaluation result, not frontend string comparison
                                const isCorrect = studentAns?.isCorrect === true;
                                const isEvaluated = studentAns?.isCorrect !== null && studentAns?.isCorrect !== undefined;

                                return (
                                    <div key={q._id} className={`score-row ${isEvaluated ? (isCorrect ? 'correct' : 'wrong') : ''}`}>
                                        <div>
                                            <div className="question-number">Question {i + 1}</div>
                                            <div className="question-text">{q.questionText}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Your Answer</div>
                                            <div style={{ fontWeight: 600 }}>{studentAns?.answer || '(no answer)'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Correct</div>
                                            <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                                                {hasCorrectAnswer ? q.correctAnswer : '(pending)'}
                                            </div>
                                            {q.answerDescription && (
                                                <div style={{ 
                                                    fontSize: 13, 
                                                    color: 'var(--text-muted)', 
                                                    marginTop: 6,
                                                    lineHeight: 1.5,
                                                    fontStyle: 'italic'
                                                }}>
                                                    💡 {q.answerDescription}
                                                </div>
                                            )}
                                        </div>
                                        {isEvaluated && (
                                            <div className={`score-result-icon ${isCorrect ? 'correct' : 'wrong'}`}>
                                                {isCorrect ? <HiOutlineCheck /> : <HiOutlineX />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScoreCard;
