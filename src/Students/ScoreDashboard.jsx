import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineChartBar,
    HiOutlineCode,
    HiOutlineStar,
    HiOutlineDocumentText,
} from 'react-icons/hi';

const ScoreDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [scores, setScores] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScores = async () => {
            try {
                const { data } = await axios.get(`/scores/student/${user._id}`);
                setScores(data);
            } catch (err) {
                toast.error('Failed to load scores');
            } finally {
                setLoading(false);
            }
        };
        fetchScores();
    }, [user._id]);

    if (loading) return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="My Scores" />
                <div className="page-container">
                    <div className="empty-state">Loading your scores...</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Score Dashboard" />
                <div className="page-container">
                    <div className="page-header">
                        <div>
                            <h2 className="page-title">Score Dashboard</h2>
                            <p className="page-description">Your combined performance overview</p>
                        </div>
                    </div>

                    {/* Aggregate Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon purple"><HiOutlineStar /></div>
                            <div>
                                <div className="stat-value">
                                    {scores?.aggregate?.totalScore || 0}
                                    <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
                                        /{scores?.aggregate?.maxScore || 0}
                                    </span>
                                </div>
                                <div className="stat-label">Total Aggregate</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon green"><HiOutlineDocumentText /></div>
                            <div>
                                <div className="stat-value">
                                    {scores?.internal?.total || 0}
                                    <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
                                        /{scores?.internal?.maxTotal || 0}
                                    </span>
                                </div>
                                <div className="stat-label">Internal Tests</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon orange"><HiOutlineCode /></div>
                            <div>
                                <div className="stat-value">
                                    {scores?.hackerRank?.total || 0}
                                    <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
                                        /{scores?.hackerRank?.maxTotal || 0}
                                    </span>
                                </div>
                                <div className="stat-label">HackerRank Coding</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon blue"><HiOutlineChartBar /></div>
                            <div>
                                <div className="stat-value">
                                    {scores?.aggregate?.maxScore
                                        ? Math.round((scores.aggregate.totalScore / scores.aggregate.maxScore) * 100)
                                        : 0}%
                                </div>
                                <div className="stat-label">Overall Percentage</div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {scores?.aggregate?.maxScore > 0 && (
                        <div className="card mb-24">
                            <div className="card-title mb-16">Overall Progress</div>
                            <div className="progress-bar-wrapper" style={{ height: 12 }}>
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: `${Math.round((scores.aggregate.totalScore / scores.aggregate.maxScore) * 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="flex justify-between mt-8">
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {scores.aggregate.totalScore} marks earned
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {scores.aggregate.maxScore} total possible
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Internal Test Scores */}
                    <div className="card mb-24">
                        <div className="card-header">
                            <h3 className="card-title">Internal Test Scores (Fillups)</h3>
                        </div>
                        {scores?.internal?.submissions?.length > 0 ? (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Assessment</th>
                                            <th>Score</th>
                                            <th>Percentage</th>
                                            <th>Date</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scores.internal.submissions.map((s, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{s.assessmentTitle}</td>
                                                <td>{s.score}/{s.totalQuestions}</td>
                                                <td>
                                                    <div className="flex items-center gap-8">
                                                        <div className="progress-bar-wrapper" style={{ width: 80 }}>
                                                            <div
                                                                className="progress-bar-fill"
                                                                style={{
                                                                    width: `${s.totalQuestions ? Math.round((s.score / s.totalQuestions) * 100) : 0}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span style={{ fontSize: 13 }}>
                                                            {s.totalQuestions ? Math.round((s.score / s.totalQuestions) * 100) : 0}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{new Date(s.submittedAt).toLocaleDateString()}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => navigate(`/student/scorecard/${s.submissionId}`)}
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-text">No internal test scores yet</div>
                            </div>
                        )}
                    </div>

                    {/* HackerRank Scores */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">HackerRank Coding Scores</h3>
                        </div>
                        {scores?.hackerRank?.scores?.length > 0 ? (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Test Name</th>
                                            <th>Score</th>
                                            <th>Percentage</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scores.hackerRank.scores.map((s) => (
                                            <tr key={s._id}>
                                                <td style={{ fontWeight: 600 }}>{s.testName}</td>
                                                <td>{s.score}/{s.maxScore}</td>
                                                <td>
                                                    <div className="flex items-center gap-8">
                                                        <div className="progress-bar-wrapper" style={{ width: 80 }}>
                                                            <div
                                                                className="progress-bar-fill"
                                                                style={{
                                                                    width: `${Math.round((s.score / s.maxScore) * 100)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span style={{ fontSize: 13 }}>
                                                            {Math.round((s.score / s.maxScore) * 100)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{new Date(s.importedAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-text">No HackerRank scores imported yet</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScoreDashboard;
