import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import LoginScreen from './components/LoginScreen';
import PatientInterface from './components/PatientInterface';
import NurseDashboard from './components/NurseDashboard';
import FamilyDashboard from './components/FamilyDashboard';
import LoadingScreen from './components/LoadingScreen';
import IntegrationTest from './components/IntegrationTest';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Dashboard Component
const Dashboard: React.FC = () => {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {user.type === 'patient' && (
        <PatientInterface user={user} onLogout={logout} />
      )}
      {user.type === 'nurse' && (
        <NurseDashboard user={user} onLogout={logout} />
      )}
      {user.type === 'family' && (
        <FamilyDashboard user={user} onLogout={logout} />
      )}
    </div>
  );
};

// Main App Component
const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginScreen />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test"
          element={
            <ProtectedRoute>
              <IntegrationTest />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

// Root App Component with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;