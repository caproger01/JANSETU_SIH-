import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PasswordInput from '../components/PasswordInput';
import { Users, GraduationCap, Briefcase, Landmark, Mail } from 'lucide-react';
import '../styles/login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.login({ email: email.trim(), password });

      if (response.ok && response.data && response.data.success) {
        const { token, user } = response.data;

        // Store token and user in AuthContext
        login(token, user);

        // Navigate based on role from database
        if (user && user.role) {
          const roleRoutes = {
            citizen: '/citizen',
            university: '/university',
            government: '/government',
            industry: '/industry'
          };
          navigate(roleRoutes[user.role] || '/role', { replace: true });
        } else {
          navigate('/role', { replace: true });
        }
      } else {
        const msg = response.data && response.data.message
          ? response.data.message
          : 'Invalid email or password.';
        setErrorMsg(msg);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Unable to connect to the server. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand">
          <Link to="/">JanSetu</Link>
          <span>Government Civic Portal</span>
        </div>
        <div className="nav-actions">
          <Link to="/signup" className="nav-button">Get Started</Link>
        </div>
      </header>

      {/* MAIN */}
      <main className="main-container">
        {/* LEFT SIDE */}
        <section className="welcome-section">
          <div className="welcome-content">
            <h1>Welcome<br />to JanSetu</h1>
            <div className="green-line"></div>
            <p className="welcome-text">
              Connecting Citizens, Universities, Industries and Government to build a better tomorrow.
            </p>
            <div className="features">
              <div className="feature">
                <div className="feature-icon">
                  <Users size={22} color="#ffffff" strokeWidth={2} />
                </div>
                <div>
                  <h3>Citizen Participation</h3>
                  <p>Report issues and track progress</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <GraduationCap size={22} color="#ffffff" strokeWidth={2} />
                </div>
                <div>
                  <h3>Academic Collaboration</h3>
                  <p>Research and innovative solutions</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <Briefcase size={22} color="#ffffff" strokeWidth={2} />
                </div>
                <div>
                  <h3>Industry Partnerships</h3>
                  <p>Share expertise and resources</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <Landmark size={22} color="#ffffff" strokeWidth={2} />
                </div>
                <div>
                  <h3>Government Integration</h3>
                  <p>Efficient civic management</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="login-section">
          <div className="login-card">
            <div className="login-heading">
              <h2>Welcome Back</h2>
              <p>Sign in to continue to JanSetu.</p>
            </div>

            {errorMsg && (
              <div className="error-message" role="alert" style={{
                background: '#fff5f5',
                border: '1px solid #fc8181',
                color: '#c53030',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {errorMsg}
              </div>
            )}

            {/* LOGIN FORM — Email + Password ONLY */}
            <form id="loginForm" onSubmit={handleSubmit}>
              {/* EMAIL */}
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-box">
                  <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={18} color="#77848c" strokeWidth={1.8} />
                  </span>
                  <input
                    type="email"
                    id="email"
                    placeholder="name@gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="form-group">
                <div className="password-header">
                  <label htmlFor="loginPassword">Password</label>
                  <a href="#">Forgot Password?</a>
                </div>
                <PasswordInput
                  id="loginPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required={true}
                  disabled={loading}
                  wrapperClassName="input-box"
                />
              </div>

              {/* SIGN IN */}
              <button type="submit" className="signin-button" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* SIGN UP LINK */}
          <div className="signup-text">
            <span>Don't have an account?</span>
            <Link to="/signup">Create Account</Link>
          </div>
        </section>
      </main>
    </>
  );
}
