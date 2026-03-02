import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineLogout } from 'react-icons/hi';

const Navbar = ({ title }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="navbar">
            <h1 className="navbar-title">{title || 'Dashboard'}</h1>
            <div className="navbar-actions">
                <div className="navbar-user">
                    <div className="navbar-avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div className="navbar-username">{user?.name}</div>
                        <div className="navbar-role">{user?.role}</div>
                    </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                    <HiOutlineLogout />
                    Logout
                </button>
            </div>
        </header>
    );
};

export default Navbar;
