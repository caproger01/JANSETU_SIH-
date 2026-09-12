import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { setStoredToken } from '../services/api';
import { Users, GraduationCap, Landmark, Briefcase } from 'lucide-react';
import '../styles/role.css';

const ROLE_OPTIONS = [
  {
    key: 'citizen',
    icon: <Users size={24} color="#075844" strokeWidth={2} />,
    title: 'Citizen',
    description: 'Report civic issues, track complaints and participate in your community.'
  },
  {
    key: 'university',
    icon: <GraduationCap size={24} color="#075844" strokeWidth={2} />,
    title: 'University',
    description: 'Collaborate on research, projects and innovative civic solutions.'
  },
  {
    key: 'government',
    icon: <Landmark size={24} color="#075844" strokeWidth={2} />,
    title: 'Government',
    description: 'Manage civic services, monitor issues and coordinate departments.'
  },
  {
    key: 'industry',
    icon: <Briefcase size={24} color="#075844" strokeWidth={2} />,
    title: 'Industry',
    description: 'Partner with communities and government to build better solutions.'
  }
];

const ROLE_ROUTES = {
  citizen: '/citizen',
  university: '/university',
  government: '/government',
  industry: '/industry'
};

export default function RoleSelection() {
  const navigate = useNavigate();
  const { user, token, updateUserRole, login } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectRole = async (role) => {
    if (loading) return;
    setErrorMsg('');
    setLoading(true);
    setSelectedRole(role);

    try {
      const response = await api.updateRole(role);

      if (response.ok && response.data && response.data.success) {
        // If backend returns a refreshed token, update it
        if (response.data.token) {
          setStoredToken(response.data.token);
        }
        // Update user in context
        if (response.data.user) {
          login(response.data.token || token, response.data.user);
        } else {
          updateUserRole(role);
        }

        // Navigate to the appropriate dashboard
        navigate(ROLE_ROUTES[role] || '/citizen', { replace: true });
      } else {
        const msg = response.data && response.data.message
          ? response.data.message
          : 'Failed to assign role. Please try again.';
        setErrorMsg(msg);
        setSelectedRole(null);
      }
    } catch (err) {
      console.error('Error assigning role:', err);
      setErrorMsg('Network error while assigning role. Please check connection and try again.');
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-selection-wrapper">
      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand">
          <Link to="/">JanSetu</Link>
          <span>Government Civic Portal</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="role-container">
        <div className="role-card">
          {/* HEADING */}
          <div className="role-heading">
            <div className="success-icon">✓</div>
            <h1>Account Created!</h1>
            <p>Before we continue, tell us what best describes you.</p>
          </div>

          {/* QUESTION */}
          <div className="question">
            <h2>What are you?</h2>
            <p>Choose your account type to personalize your JanSetu experience.</p>
          </div>

          {errorMsg && (
            <div role="alert" style={{
              background: '#fff5f5',
              border: '1px solid #fc8181',
              color: '#c53030',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: '500',
              textAlign: 'center'
            }}>
              {errorMsg}
            </div>
          )}

          {/* OPTIONS */}
          <div className="role-grid">
            {ROLE_OPTIONS.map(({ key, icon, title, description }) => (
              <button
                key={key}
                className={`role-option${selectedRole === key ? ' selected' : ''}`}
                onClick={() => handleSelectRole(key)}
                disabled={loading}
                style={{
                  borderColor: user && user.role === key ? '#004d3d' : undefined,
                  backgroundColor: user && user.role === key ? '#f0fdf4' : undefined,
                  opacity: loading && selectedRole !== key ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                <div className="role-icon">{icon}</div>
                <div className="role-content">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span className="arrow">
                  {loading && selectedRole === key ? '⏳' : '→'}
                </span>
              </button>
            ))}
          </div>

          <p className="bottom-text">
            Note: Role selection is permanent once assigned to ensure verified departmental security.
          </p>
        </div>
      </main>
    </div>
  );
}
