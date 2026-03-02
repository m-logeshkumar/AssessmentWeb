import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Admin
import ManageAssessments from './Admin/Assessments/ManageAssessments';
import EvaluateTest from './Admin/Assessments/EvaluateTest';
import ManageStudents from './Admin/ManageStudents';

// Student
import AvailableTests from './Students/AvailableTests';
import TakeTest from './Students/TakeTest';
import ScoreDashboard from './Students/ScoreDashboard';
import ScoreCard from './Students/ScoreCard';

// Shared
import Leaderboard from './components/Leaderboard';

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="auth-page"><div className="empty-state">Loading...</div></div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin/assessments' : '/student/scores'} />;
  }
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="auth-page"><div className="empty-state">Loading...</div></div>;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin/assessments' : '/student/scores'} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'admin' ? '/admin/assessments' : '/student/scores'} /> : <Register />} />

      {/* Admin Routes */}
      <Route path="/admin/assessments" element={<ProtectedRoute allowedRoles={['admin']}><ManageAssessments /></ProtectedRoute>} />
      <Route path="/admin/assessments/:id/evaluate" element={<ProtectedRoute allowedRoles={['admin']}><EvaluateTest /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><ManageStudents /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student/tests" element={<ProtectedRoute allowedRoles={['student']}><AvailableTests /></ProtectedRoute>} />
      <Route path="/student/test/:id" element={<ProtectedRoute allowedRoles={['student']}><TakeTest /></ProtectedRoute>} />
      <Route path="/student/scores" element={<ProtectedRoute allowedRoles={['student']}><ScoreDashboard /></ProtectedRoute>} />
      <Route path="/student/scorecard/:submissionId" element={<ProtectedRoute allowedRoles={['student']}><ScoreCard /></ProtectedRoute>} />

      {/* Shared */}
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

      {/* Default */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
