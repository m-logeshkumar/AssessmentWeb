import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
    HiOutlineUserGroup,
    HiOutlinePlus,
    HiOutlineUpload,
    HiOutlineCode,
    HiOutlineTrash,
} from 'react-icons/hi';

const ManageStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHRModal, setShowHRModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [hrForm, setHrForm] = useState({ testName: '', score: '', maxScore: '100' });
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchStudents = async () => {
        try {
            const { data } = await axios.get('/auth/students');
            setStudents(data);
        } catch (err) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const openHRModal = (student) => {
        setSelectedStudent(student);
        setHrForm({ testName: '', score: '', maxScore: '100' });
        setShowHRModal(true);
    };

    const handleManualHREntry = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/hackerrank/manual', {
                studentId: selectedStudent._id,
                testName: hrForm.testName,
                score: parseFloat(hrForm.score),
                maxScore: parseFloat(hrForm.maxScore),
            });
            toast.success(`HackerRank score added for ${selectedStudent.name}`);
            setShowHRModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add score');
        }
    };

    const handleCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await axios.post('/hackerrank/import-csv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(data.message);
            setShowCSVModal(false);
        } catch (err) {
            toast.error('CSV import failed');
        }
    };

    const confirmDelete = (student) => {
        setStudentToDelete(student);
        setShowDeleteModal(true);
    };

    const handleDeleteUser = async () => {
        if (!studentToDelete) return;
        
        setDeleting(true);
        try {
            const { data } = await axios.delete(`/auth/users/${studentToDelete._id}`);
            toast.success(data.message);
            setShowDeleteModal(false);
            setStudentToDelete(null);
            // Refresh the student list
            fetchStudents();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Manage Students" />
                <div className="page-container">
                    <div className="page-header">
                        <div>
                            <h2 className="page-title">Students</h2>
                            <p className="page-description">Manage students and HackerRank scores</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowCSVModal(true)}>
                            <HiOutlineUpload /> Import CSV
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon blue"><HiOutlineUserGroup /></div>
                            <div>
                                <div className="stat-value">{students.length}</div>
                                <div className="stat-label">Total Students</div>
                            </div>
                        </div>
                    </div>

                    {/* Student List */}
                    {students.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <div className="empty-state-title">No students registered yet</div>
                            <div className="empty-state-text">Students will appear here once they register</div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s) => (
                                        <tr key={s._id}>
                                            <td>
                                                <div className="flex items-center gap-12">
                                                    <div className="navbar-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                                                        {s.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                                                </div>
                                            </td>
                                            <td>{s.email}</td>
                                            <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div className="flex gap-8">
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => openHRModal(s)}
                                                    >
                                                        <HiOutlineCode /> Add HR Score
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => confirmDelete(s)}
                                                        title="Delete user and all data"
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

                    {/* Manual HackerRank Entry Modal */}
                    {showHRModal && (
                        <div className="modal-overlay" onClick={() => setShowHRModal(false)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="modal-title">Add HackerRank Score</h3>
                                    <button className="modal-close" onClick={() => setShowHRModal(false)}>×</button>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                                    Adding score for <strong>{selectedStudent?.name}</strong>
                                </p>
                                <form onSubmit={handleManualHREntry}>
                                    <div className="form-group">
                                        <label className="form-label">Test Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Python Challenge"
                                            value={hrForm.testName}
                                            onChange={(e) => setHrForm({ ...hrForm, testName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-12">
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Score</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                value={hrForm.score}
                                                onChange={(e) => setHrForm({ ...hrForm, score: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Max Score</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="1"
                                                value={hrForm.maxScore}
                                                onChange={(e) => setHrForm({ ...hrForm, maxScore: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full">
                                        Add Score
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* CSV Import Modal */}
                    {showCSVModal && (
                        <div className="modal-overlay" onClick={() => setShowCSVModal(false)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="modal-title">Import HackerRank CSV</h3>
                                    <button className="modal-close" onClick={() => setShowCSVModal(false)}>×</button>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                                    Upload a CSV file with columns: <code>email</code>, <code>testName</code>, <code>score</code>, <code>maxScore</code>
                                </p>
                                <div className="form-group">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCSVUpload}
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && (
                        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="modal-title">Delete User</h3>
                                    <button 
                                        className="modal-close" 
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={deleting}
                                    >×</button>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                                        Are you sure you want to delete <strong>{studentToDelete?.name}</strong>?
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
                                            <li>User account</li>
                                            <li>All test submissions</li>
                                            <li>All HackerRank scores</li>
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
                                        onClick={handleDeleteUser}
                                        disabled={deleting}
                                        style={{ flex: 1 }}
                                    >
                                        {deleting ? 'Deleting...' : 'Delete User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageStudents;
