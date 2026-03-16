import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import {
    HiOutlinePlus,
    HiOutlinePlay,
    HiOutlineStop,
    HiOutlineTrash,
    HiOutlineClipboardCheck,
    HiOutlineClock,
} from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const ManageAssessments = () => {
    const [assessments, setAssessments] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(30);
    const [questions, setQuestions] = useState([{ questionText: '' }]);
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [assessmentToDelete, setAssessmentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
    const [selectedAssessmentForSubmissions, setSelectedAssessmentForSubmissions] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [allSubmissions, setAllSubmissions] = useState([]);
    const navigate = useNavigate();

    const fetchAssessments = async () => {
        try {
            const { data } = await axios.get('/assessments');
            setAssessments(data);
        } catch (err) {
            toast.error('Failed to load assessments');
        }
    };

    useEffect(() => {
        fetchAssessments();
        fetchAllSubmissions();
    }, []);

    const fetchAllSubmissions = async () => {
        try {
            // Fetch submissions for all active assessments
            const assessmentResponse = await axios.get('/assessments');
            const activeAssessments = assessmentResponse.data.filter(a => a.status === 'active' || a.status === 'completed');
            
            let allSubs = [];
            for (const assessment of activeAssessments) {
                try {
                    const { data } = await axios.get(`/submissions/assessment/${assessment._id}`);
                    allSubs = [...allSubs, ...data];
                } catch (err) {
                    // Skip if error fetching for this assessment
                }
            }
            setAllSubmissions(allSubs);
        } catch (err) {
            console.log('Could not fetch submissions');
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { questionText: '' }]);
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index, text) => {
        const updated = [...questions];
        updated[index].questionText = text;
        setQuestions(updated);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/assessments', { title, questions, duration });
            toast.success('Assessment created!');
            setTitle('');
            setDuration(30);
            setQuestions([{ questionText: '' }]);
            setShowCreate(false);
            fetchAssessments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create assessment');
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async (id) => {
        try {
            await axios.put(`/assessments/${id}/start`);
            toast.success('Assessment started! Timer is running.');
            fetchAssessments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start');
        }
    };

    const handleStop = async (id) => {
        try {
            await axios.put(`/assessments/${id}/stop`);
            toast.success('Assessment stopped. Answers auto-saved.');
            fetchAssessments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to stop');
        }
    };

    const confirmDelete = (assessment) => {
        setAssessmentToDelete(assessment);
        setShowDeleteModal(true);
    };

    const handleViewSubmissions = async (assessment) => {
        setSelectedAssessmentForSubmissions(assessment);
        setLoadingSubmissions(true);
        try {
            const { data } = await axios.get(`/submissions/assessment/${assessment._id}`);
            setSubmissions(data);
            setShowSubmissionsModal(true);
        } catch (err) {
            toast.error('Failed to load submissions');
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const handleDelete = async () => {
        if (!assessmentToDelete) return;
        
        setDeleting(true);
        try {
            await axios.delete(`/assessments/${assessmentToDelete._id}`);
            toast.success('Assessment and all submissions deleted');
            setShowDeleteModal(false);
            setAssessmentToDelete(null);
            fetchAssessments();
        } catch (err) {
            toast.error('Failed to delete');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Manage Assessments" />
                <div className="page-container">
                    <div className="page-header">
                        <div>
                            <h2 className="page-title">Assessments</h2>
                            <p className="page-description">Create and manage fillup tests</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            <HiOutlinePlus /> New Assessment
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon purple"><HiOutlineClipboardCheck /></div>
                            <div>
                                <div className="stat-value">{assessments.length}</div>
                                <div className="stat-label">Total Assessments</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon green">
                                <HiOutlinePlay />
                            </div>
                            <div>
                                <div className="stat-value">
                                    {assessments.filter(a => a.status === 'active').length}
                                </div>
                                <div className="stat-label">Active Now</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon blue">
                                <HiOutlineClock />
                            </div>
                            <div>
                                <div className="stat-value">
                                    {assessments.filter(a => a.status === 'completed').length}
                                </div>
                                <div className="stat-label">Completed</div>
                            </div>
                        </div>
                    </div>

                    {/* Assessment List */}
                    {assessments.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📝</div>
                            <div className="empty-state-title">No assessments yet</div>
                            <div className="empty-state-text">
                                Create your first assessment to get started
                            </div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Questions</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessments.map((a) => (
                                        <tr key={a._id}>
                                            <td style={{ fontWeight: 600 }}>{a.title}</td>
                                            <td>{a.questions?.length || 0}</td>
                                            <td>{a.duration} min</td>
                                            <td>
                                                <span className={`badge badge-${a.status}`}>{a.status}</span>
                                            </td>
                                            <td>
                                                <div className="flex gap-8">
                                                    {a.status === 'draft' && (
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleStart(a._id)}
                                                        >
                                                            <HiOutlinePlay /> Start
                                                        </button>
                                                    )}
                                                    {a.status === 'active' && (
                                                        <div className="flex gap-8 align-center">
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleStop(a._id)}
                                                            >
                                                                <HiOutlineStop /> Stop
                                                            </button>
                                                            <button
                                                                className="btn btn-info btn-sm"
                                                                onClick={() => handleViewSubmissions(a)}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                {allSubmissions.filter(s => s.assessmentId === a._id && s.submittedAt).length}/{allSubmissions.filter(s => s.assessmentId === a._id).length || 0}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {a.status === 'completed' && (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => navigate(`/admin/assessments/${a._id}/evaluate`)}
                                                        >
                                                            <HiOutlineClipboardCheck /> Evaluate
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => confirmDelete(a)}
                                                        title="Delete assessment and all submissions"
                                                    >
                                                        <HiOutlineTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && (
                        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="modal-title">Delete Assessment</h3>
                                    <button 
                                        className="modal-close" 
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={deleting}
                                    >×</button>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                                        Are you sure you want to delete <strong>{assessmentToDelete?.title}</strong>?
                                    </p>
                                    <div style={{ 
                                        background: 'var(--danger-bg)', 
                                        padding: '12px 16px', 
                                        borderRadius: 6,
                                        color: 'var(--danger)',
                                        fontSize: 14
                                    }}>
                                        ⚠️ This will permanently delete:
                                        <ul style={{ marginTop: 8, marginLeft: 20 }}>
                                            <li>Assessment "{assessmentToDelete?.title}"</li>
                                            <li>All {assessmentToDelete?.questions?.length || 0} questions</li>
                                            <li>All student submissions</li>
                                            <li>All scores and results</li>
                                        </ul>
                                        <strong>This action cannot be undone!</strong>
                                    </div>
                                </div>
                                <div className="flex gap-12">
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={deleting}
                                        style={{ flex: 1 }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="btn btn-danger" 
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        style={{ flex: 1 }}
                                    >
                                        {deleting ? 'Deleting...' : 'Delete Assessment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submissions Status Modal */}
                    {showSubmissionsModal && selectedAssessmentForSubmissions && (
                        <div className="modal-overlay" onClick={() => !loadingSubmissions && setShowSubmissionsModal(false)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                                <div className="modal-header">
                                    <h3 className="modal-title">Submission Status - {selectedAssessmentForSubmissions?.title}</h3>
                                    <button 
                                        className="modal-close" 
                                        onClick={() => setShowSubmissionsModal(false)}
                                        disabled={loadingSubmissions}
                                    >×</button>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    {loadingSubmissions ? (
                                        <div style={{ textAlign: 'center', padding: '20px' }}>Loading submissions...</div>
                                    ) : submissions.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                            No submissions yet
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {submissions
                                                .filter(s => s.assessmentId === selectedAssessmentForSubmissions._id)
                                                .map((submission, idx) => (
                                                <div 
                                                    key={submission._id} 
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '12px 16px',
                                                        backgroundColor: submission.submittedAt ? 'var(--success-bg)' : 'var(--warning-bg)',
                                                        borderRadius: '6px',
                                                        borderLeft: `4px solid ${submission.submittedAt ? 'var(--success)' : 'var(--warning)'}`
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                            {submission.studentId?.name || `Student ${idx + 1}`}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                            {submission.submittedAt 
                                                                ? `Submitted at ${new Date(submission.submittedAt).toLocaleString()}`
                                                                : 'Not submitted'
                                                            }
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        backgroundColor: submission.submittedAt ? 'var(--success)' : 'var(--danger)',
                                                        color: 'white',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {submission.submittedAt ? '✓' : '✗'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-12">
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={() => setShowSubmissionsModal(false)}
                                        style={{ flex: 1 }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create Modal */}
                    {showCreate && (
                        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="modal-title">Create Assessment</h3>
                                    <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
                                </div>
                                <form onSubmit={handleCreate}>
                                    <div className="form-group">
                                        <label className="form-label">Title</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. JavaScript Fundamentals"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Duration (minutes)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="1"
                                            value={duration}
                                            onChange={(e) => setDuration(parseInt(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Questions (Fill in the Blank)</label>
                                        {questions.map((q, i) => (
                                            <div key={i} className="question-item">
                                                <div className="question-number">Question {i + 1}</div>
                                                <div className="flex gap-8">
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        placeholder="Enter question text..."
                                                        value={q.questionText}
                                                        onChange={(e) => updateQuestion(i, e.target.value)}
                                                        required
                                                        style={{ flex: 1 }}
                                                    />
                                                    {questions.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => removeQuestion(i)}
                                                        >
                                                            <HiOutlineTrash />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm mt-8"
                                            onClick={addQuestion}
                                        >
                                            <HiOutlinePlus /> Add Question
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-full"
                                        disabled={loading}
                                    >
                                        {loading ? 'Creating...' : 'Create Assessment'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageAssessments;
