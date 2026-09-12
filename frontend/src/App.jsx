import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RoleSelection from './pages/RoleSelection';

// Dashboards
import CitizenDashboard from './pages/dashboards/CitizenDashboard';
import UniversityDashboard from './pages/dashboards/UniversityDashboard';
import GovernmentDashboard from './pages/dashboards/GovernmentDashboard';
import IndustryDashboard from './pages/dashboards/IndustryDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected — must be logged in */}
          <Route
            path="/role"
            element={
              <ProtectedRoute>
                <RoleSelection />
              </ProtectedRoute>
            }
          />

          {/* Dashboard routes — must be logged in with appropriate role */}
          <Route
            path="/citizen"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university"
            element={
              <ProtectedRoute allowedRoles={['university']}>
                <UniversityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/government"
            element={
              <ProtectedRoute allowedRoles={['government']}>
                <GovernmentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/industry"
            element={
              <ProtectedRoute allowedRoles={['industry']}>
                <IndustryDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback — redirect unknown paths to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
