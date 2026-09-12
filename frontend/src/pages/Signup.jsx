import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PasswordInput from '../components/PasswordInput';
import { Users, GraduationCap, Briefcase, Landmark, User, Mail, Phone } from 'lucide-react';
import '../styles/signup.css';

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const { fullName, email, password, confirmPassword, mobile } = formData;

    // Client-side validation
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.signup({
        name: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        password,
        confirmPassword
      });

      if (response.ok && response.data && response.data.success) {
        const { token, user } = response.data;
        login(token, user);
        navigate('/role', { replace: true });
      } else {
        const msg = response.data && response.data.message
          ? response.data.message
          : 'Registration failed. Please try again.';
        setErrorMsg(msg);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setErrorMsg('An error occurred during registration. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* HEADER */}
      <header>
        <div className="brand">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1>JanSetu</h1>
          </Link>
          <p>Government Civic Portal</p>
        </div>
        <div className="header-buttons">
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button type="button" style={{ color: 'white', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', cursor: 'pointer' }}>
              Sign In
            </button>
          </Link>
        </div>
      </header>

      <main className="main">
        {/* LEFT PANEL */}
        <section className="left-panel">
          <h2>Welcome<br />to JanSetu</h2>
          <div className="green-line"></div>
          <p className="description">
            Connecting Citizens, Universities, Industries and Government to build a better tomorrow.
          </p>
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
        </section>

        {/* RIGHT PANEL */}
        <section className="right-panel" id="signup">
          <div className="signup-card">
            <div className="signup-title">
              <h2>Create Your Account</h2>
              <p>Join JanSetu and be a part of the change.</p>
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
                fontWeight: '500'
              }}>
                {errorMsg}
              </div>
            )}

            <form id="signupForm" onSubmit={handleSubmit}>
              {/* NAME + EMAIL */}
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={18} color="#77848c" strokeWidth={1.8} />
                    </span>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mail size={18} color="#77848c" strokeWidth={1.8} />
                    </span>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="name@gov.in"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* PASSWORD + CONFIRM PASSWORD */}
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <PasswordInput
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required={true}
                    disabled={loading}
                    wrapperClassName="input-wrapper"
                  />
                  <p className="password-note">Password must be at least 8 characters long.</p>
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required={true}
                    disabled={loading}
                    wrapperClassName="input-wrapper"
                  />
                </div>
              </div>

              {/* MOBILE */}
              <div className="form-group">
                <label>Mobile Number</label>
                <div className="input-wrapper">
                  <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={18} color="#77848c" strokeWidth={1.8} />
                  </span>
                  <input
                    type="tel"
                    id="mobile"
                    name="mobile"
                    placeholder="Enter your mobile number"
                    value={formData.mobile}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* SUBMIT */}
              <button type="submit" className="create-btn" id="submitBtn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#666' }}>
              Already have an account? <Link to="/login" style={{ color: '#004d3d', fontWeight: '600' }}>Sign In</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
