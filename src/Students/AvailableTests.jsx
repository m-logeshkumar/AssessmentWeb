import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlinePlay } from 'react-icons/hi';

const AvailableTests = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const { data } = await axios.get('/assessments');
                setAssessments(data);
            } catch (err) {
                toast.error('Failed to load tests');
            } finally {
                setLoading(false);
            }
        };
        fetchTests();
    }, []);

    const activeTests = assessments.filter(a => a.status === 'active');
    const completedTests = assessments.filter(a => a.status === 'completed');

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Available Tests" />
                <div className="page-container">
                    <div className="page-header">
                        <div>
                            <h2 className="page-title">Available Tests</h2>
                            <p className="page-description">Take active assessments or view past results</p>
                        </div>
                    </div>

                    {/* Active Tests */}
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--success)' }}>
                        🟢 Active Tests
                    </h3>
                    {activeTests.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 32 }}>
                            {activeTests.map(a => (
                                <div key={a._id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/student/test/${a._id}`)}>
                                    <div className="flex justify-between items-center mb-16">
                                        <span className="badge badge-active">Active</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.duration} min</span>
                                    </div>
                                    <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{a.title}</h4>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {a.questions?.length} questions • Fill in the blanks
                                    </p>
                                    <button className="btn btn-success w-full mt-16">
                                        <HiOutlinePlay /> Start Test
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card mb-24">
                            <div className="empty-state">
                                <div className="empty-state-text">No active tests right now</div>
                            </div>
                        </div>
                    )}

                    {/* Completed Tests */}
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--info)' }}>
                        🔵 Completed Tests
                    </h3>
                    {completedTests.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Questions</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {completedTests.map(a => (
                                        <tr key={a._id}>
                                            <td style={{ fontWeight: 600 }}>{a.title}</td>
                                            <td>{a.questions?.length}</td>
                                            <td>{a.duration} min</td>
                                            <td><span className="badge badge-completed">Completed</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-text">No completed tests yet</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AvailableTests;
