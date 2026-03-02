import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineAcademicCap,
    HiOutlineClipboardList,
    HiOutlineChartBar,
    HiOutlineUserGroup,
    HiOutlineStar,
    HiOutlineDocumentText,
    HiOutlineCode,
} from 'react-icons/hi';

const Sidebar = () => {
    const { user } = useAuth();

    const adminLinks = [
        { to: '/admin/assessments', icon: <HiOutlineClipboardList />, label: 'Assessments' },
        { to: '/admin/students', icon: <HiOutlineUserGroup />, label: 'Students' },
        { to: '/leaderboard', icon: <HiOutlineStar />, label: 'Leaderboard' },
    ];

    const studentLinks = [
        { to: '/student/tests', icon: <HiOutlineDocumentText />, label: 'Available Tests' },
        { to: '/student/scores', icon: <HiOutlineChartBar />, label: 'My Scores' },
        { to: '/leaderboard', icon: <HiOutlineStar />, label: 'Leaderboard' },
    ];

    const links = user?.role === 'admin' ? adminLinks : studentLinks;

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">A</div>
                <div>
                    <div className="sidebar-title">AssessHub</div>
                    <div className="sidebar-subtitle">Assessment Platform</div>
                </div>
            </div>
            <nav className="sidebar-nav">
                <div className="sidebar-section-title">
                    {user?.role === 'admin' ? 'Administration' : 'Dashboard'}
                </div>
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="sidebar-icon">{link.icon}</span>
                        {link.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
