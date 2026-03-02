import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import {
    HiOutlineStar,
    HiOutlineSearch,
} from 'react-icons/hi';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { data } = await axios.get('/scores/leaderboard');
                setLeaderboard(data);
            } catch (err) {
                toast.error('Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const filtered = leaderboard.filter(e =>
        e.student.name.toLowerCase().includes(search.toLowerCase()) ||
        e.student.email.toLowerCase().includes(search.toLowerCase())
    );

    const getRankClass = (rank) => {
        if (rank === 1) return 'rank-1';
        if (rank === 2) return 'rank-2';
        if (rank === 3) return 'rank-3';
        return 'rank-default';
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Leaderboard" />
                <div className="page-container">
                    <div className="page-header">
                        <div>
                            <h2 className="page-title">🏆 Leaderboard</h2>
                            <p className="page-description">Combined performance rankings</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="card mb-24">
                        <div className="flex items-center gap-12">
                            <HiOutlineSearch style={{ fontSize: 20, color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search students..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ border: 'none', background: 'transparent', padding: 0 }}
                            />
                        </div>
                    </div>

                    {/* Leaderboard List */}
                    {loading ? (
                        <div className="empty-state">Loading rankings...</div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🏅</div>
                            <div className="empty-state-title">No rankings yet</div>
                            <div className="empty-state-text">Students will appear once they have scores</div>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Top 3 Podium */}
                            {filtered.length >= 3 && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 16,
                                    padding: 24,
                                    background: 'rgba(99, 102, 241, 0.04)',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    {[1, 0, 2].map(idx => {
                                        const entry = filtered[idx];
                                        if (!entry) return null;
                                        return (
                                            <div key={entry.student._id} style={{ textAlign: 'center', padding: 16 }}>
                                                <div
                                                    className={`leaderboard-rank ${getRankClass(entry.rank)}`}
                                                    style={{
                                                        width: idx === 1 ? 56 : 44,
                                                        height: idx === 1 ? 56 : 44,
                                                        fontSize: idx === 1 ? 22 : 16,
                                                        margin: '0 auto 12px',
                                                    }}
                                                >
                                                    {entry.rank}
                                                </div>
                                                <div className="leaderboard-name">{entry.student.name}</div>
                                                <div className="leaderboard-total" style={{ fontSize: idx === 1 ? 28 : 22, marginTop: 4 }}>
                                                    {entry.totalScore}
                                                </div>
                                                <div className="leaderboard-breakdown">
                                                    Internal: {entry.internalScore} • HR: {entry.hackerRankScore}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Full List */}
                            {filtered.map((entry) => (
                                <div key={entry.student._id} className="leaderboard-item">
                                    <div className={`leaderboard-rank ${getRankClass(entry.rank)}`}>
                                        {entry.rank}
                                    </div>
                                    <div className="leaderboard-info">
                                        <div className="leaderboard-name">{entry.student.name}</div>
                                        <div className="leaderboard-email">{entry.student.email}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        {entry.maxScore > 0 && (
                                            <div className="progress-bar-wrapper">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{
                                                        width: `${Math.round((entry.totalScore / entry.maxScore) * 100)}%`,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="leaderboard-score">
                                        <div className="leaderboard-total">{entry.totalScore}</div>
                                        <div className="leaderboard-breakdown">
                                            Internal: {entry.internalScore} • HR: {entry.hackerRankScore}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
