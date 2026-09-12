import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        color: '#004d3d',
        background: '#f7f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🇮🇳</div>
          <p style={{ fontWeight: 600 }}>Verifying JanSetu Session...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is required and user has not selected a role yet
  if (allowedRoles && (!user.role || user.role === 'null')) {
    return <Navigate to="/role" replace />;
  }

  // If specific roles are required and user has a different role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRoutes = {
      citizen: '/citizen',
      university: '/university',
      government: '/government',
      industry: '/industry'
    };
    const target = roleRoutes[user.role] || '/role';
    return <Navigate to={target} replace />;
  }

  return children;
}
