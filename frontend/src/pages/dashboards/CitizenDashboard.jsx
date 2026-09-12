import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  MessageSquare,
  PlusCircle,
  FileText,
  TrendingUp,
  Bell,
  LogOut,
  MapPin,
  CheckCircle2,
  X,
  User,
  Info,
  AlertCircle,
  Trash2,
  Building2
} from 'lucide-react';
import ProblemLocationMap from '../../components/ProblemLocationMap';
import ProjectTimeline from '../../components/ProjectTimeline';
import '../../styles/citizen-dashboard.css';

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSubmitted: 0, resolvedCount: 0, inProgressCount: 0, rejectedCount: 0 });
  const [problems, setProblems] = useState([]);
  const [notices, setNotices] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [problemProgress, setProblemProgress] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [showNoticesModal, setShowNoticesModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [citizenProfile, setCitizenProfile] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    category: 'Public Infrastructure',
    subcategory: 'Street Lighting & Power',
    ward: 'Ward 12, Civil Lines',
    location: '',
    latitude: '28.6139',
    longitude: '77.2090',
    affectedPopulation: 100,
    urgency: 'MEDIUM'
  });
  const [communityStats, setCommunityStats] = useState({
    activePublicRequests: 0,
    communityProjectsOngoing: 0,
    participatingCitizens: 0
  });
  const [publicProblems, setPublicProblems] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [preScreenLoading, setPreScreenLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, noticesRes, notifRes] = await Promise.all([
        api.getCitizenOverview(),
        api.getCitizenNotices(),
        api.getNotifications()
      ]);

      if (overviewRes.ok && overviewRes.data.data) {
        const { stats, recentProblems, communityStats: cStats, publicProblems: pProblems, profile: cProfile } = overviewRes.data.data;
        setStats(stats || { totalSubmitted: 0, resolvedCount: 0, inProgressCount: 0, rejectedCount: 0 });
        setProblems(recentProblems || []);
        if (cStats) {
          setCommunityStats(cStats);
        }
        if (pProblems && pProblems.length > 0) {
          setPublicProblems(pProblems);
        }
        if (cProfile) {
          setCitizenProfile(cProfile);
        }
        if (recentProblems && recentProblems.length > 0) {
          setSelectedProblem(recentProblems[0]);
        }
      }

      if (noticesRes.ok && noticesRes.data.data) {
        setNotices(noticesRes.data.data);
      }

      if (notifRes.ok && notifRes.data.data) {
        setNotifications(notifRes.data.data.notifications || []);
        setUnreadCount(notifRes.data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load citizen overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of JanSetu?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const handleViewDetails = async (problemId) => {
    try {
      const [res, progressRes] = await Promise.all([
        api.getCitizenProblemById(problemId),
        api.getCitizenProblemProgress(problemId)
      ]);
      if (res.ok && res.data.data) {
        setSelectedProblem(res.data.data.problem);
        setTimeline(res.data.data.timeline || []);
      }
      if (progressRes.ok && progressRes.data.data) {
        setProblemProgress(progressRes.data.data);
      } else {
        setProblemProgress(null);
      }
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
  };

  const handleDeleteProblem = async (problemId, problemTitle) => {
    const confirmMessage = problemTitle
      ? `Are you sure you want to withdraw/delete your grievance: "${problemTitle}"?\n\nThis action cannot be undone.`
      : 'Are you sure you want to withdraw/delete this grievance?\n\nThis action cannot be undone.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const res = await api.deleteCitizenProblem(problemId);
      if (res.ok && res.data.success) {
        // Remove deleted problem from state immediately
        setProblems(prev => prev.filter(p => p.id !== problemId));
        setPublicProblems(prev => prev.filter(p => p.id !== problemId));
        if (selectedProblem?.id === problemId) {
          setSelectedProblem(null);
          setShowDetailsModal(false);
        }
        // Refresh overview stats and community stats from backend
        fetchData();
        alert('Your grievance has been successfully deleted.');
      } else {
        alert(res.data?.message || 'Failed to delete problem. Please try again.');
      }
    } catch (err) {
      console.error('Delete problem error:', err);
      alert('An error occurred while deleting the grievance.');
    }
  };

  const handlePreScreen = async () => {
    if (!reportForm.title || !reportForm.description) {
      alert('Please fill in Problem Title and Description before requesting AI Pre-screening.');
      return;
    }

    setPreScreenLoading(true);
    try {
      const res = await api.preScreenProblem({
        title: reportForm.title.trim(),
        description: reportForm.description.trim(),
        category: reportForm.category,
        location: `${reportForm.ward} - ${reportForm.location}`,
        affectedPopulation: reportForm.affectedPopulation
      });

      if (res.ok && res.data.data) {
        const { analysis, duplicateCheck } = res.data.data;
        setAiAnalysis(analysis);
        setDuplicateMatch(duplicateCheck?.potentialDuplicate || null);

        if (analysis.category) {
          setReportForm(prev => ({
            ...prev,
            category: analysis.category,
            subcategory: analysis.subcategory || prev.subcategory
          }));
        }
      }
    } catch (err) {
      console.error('AI Pre-screen error:', err);
    } finally {
      setPreScreenLoading(false);
    }
  };

  const handleSubmitProblem = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    try {
      let res;
      if (selectedFiles && selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append('title', reportForm.title.trim());
        formData.append('description', reportForm.description.trim());
        formData.append('category', reportForm.category);
        formData.append('subcategory', reportForm.subcategory);
        formData.append('ward', reportForm.ward.trim());
        formData.append('location', (reportForm.location || reportForm.ward).trim());
        formData.append('latitude', reportForm.latitude || '28.6139');
        formData.append('longitude', reportForm.longitude || '77.2090');
        formData.append('affectedPopulation', reportForm.affectedPopulation || 100);
        formData.append('urgency', reportForm.urgency || 'MEDIUM');

        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append('images', selectedFiles[i]);
        }
        res = await api.submitCitizenProblem(formData);
      } else {
        res = await api.submitCitizenProblemJSON({
          title: reportForm.title.trim(),
          description: reportForm.description.trim(),
          category: reportForm.category,
          subcategory: reportForm.subcategory,
          ward: reportForm.ward.trim(),
          location: (reportForm.location || reportForm.ward).trim(),
          latitude: reportForm.latitude || '28.6139',
          longitude: reportForm.longitude || '77.2090',
          affectedPopulation: reportForm.affectedPopulation || 100,
          urgency: reportForm.urgency || 'MEDIUM'
        });
      }

      if (res.ok && res.data && res.data.success) {
        const newProb = res.data.data;
        alert(`Problem successfully registered!\n\nTracking Code: ${newProb.code}\nDepartment: ${newProb.assigned_department || 'Municipal Central Dispatch'}`);
        setShowReportModal(false);
        setReportForm({
          title: '',
          description: '',
          category: 'Public Infrastructure',
          subcategory: 'Street Lighting & Power',
          ward: 'Ward 12, Civil Lines',
          location: '',
          latitude: '28.6139',
          longitude: '77.2090',
          affectedPopulation: 100,
          urgency: 'MEDIUM'
        });
        setSelectedFiles([]);
        setAiAnalysis(null);
        setDuplicateMatch(null);
        await fetchData();
      } else {
        const msg = res.data?.message || 'Failed to submit problem. Please verify all required fields.';
        setSubmitError(msg);
      }
    } catch (err) {
      console.error('Problem submission error:', err);
      setSubmitError('An unexpected error occurred during submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markNotificationRead('all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark notifications read error:', err);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'status-submitted';
      case 'UNDER REVIEW': return 'status-review';
      case 'OFFICER ASSIGNED': return 'status-assigned';
      case 'UNIVERSITY ASSIGNED': return 'status-university';
      case 'RESOLVED': return 'status-resolved';
      case 'REJECTED': return 'status-rejected';
      default: return 'status-submitted';
    }
  };

  const STAGES = ['SUBMITTED', 'UNDER REVIEW', 'OFFICER ASSIGNED', 'UNIVERSITY ASSIGNED', 'RESOLVED'];

  return (
    <>
      {/* HEADER */}
      <header className="top-header">
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="in-emblem">
            IN
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#075844', margin: 0, lineHeight: 1.1 }}>JanSetu</h1>
            <p style={{ fontSize: '13px', color: '#4B5563', margin: '3px 0 0 0', fontWeight: 500 }}>
              Government Civic Portal &bull; Citizen Portal
            </p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            className="notif-circle-btn"
            onClick={() => setShowNotifModal(true)}
            title="Notifications"
          >
            <Bell size={18} color="#374151" />
            {unreadCount > 0 && (
              <span className="notif-badge-count">{unreadCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            title="View Profile Details"
          >
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EDF5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#075844' }}>
              <User size={15} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              {user ? user.name : 'Citizen Account'}
            </span>
          </button>
          <button
            type="button"
            className="header-logout-btn"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* TOP NAV */}
      <nav className="top-nav" style={{ backgroundColor: '#075844', padding: '0 28px' }}>
        <ul className="nav-links" style={{ display: 'flex', gap: '24px', listStyle: 'none', margin: 0, padding: 0, alignItems: 'center' }}>
          <li>
            <Link to="/" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '14px', padding: '12px 0', display: 'inline-block', opacity: 0.9 }}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/citizen" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '14px', padding: '12px 0', display: 'inline-block', fontWeight: 700, borderBottom: '3px solid #FF9933' }}>
              Citizens
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                padding: '12px 0',
                cursor: 'pointer',
                opacity: 0.9,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Report Problem
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                padding: '12px 0',
                cursor: 'pointer',
                opacity: 0.9,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Info
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                padding: '12px 0',
                cursor: 'pointer',
                opacity: 0.9,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Profile
            </button>
          </li>
        </ul>
      </nav>

      {/* DASHBOARD BODY */}
      <div className="dashboard-body">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="role-badge-box">
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>Citizen</h2>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: '#c7eedd', display: 'block', marginTop: '3px' }}>
              CITIZEN PANEL
            </span>
          </div>
          <nav className="sidebar-menu">
            <button
              type="button"
              className="sidebar-link active"
              onClick={() => {}}
            >
              <MessageSquare size={17} color="#075844" />
              <span>My Issues</span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={() => setShowReportModal(true)}
            >
              <PlusCircle size={17} />
              <span>Report Problem</span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={() => setShowNoticesModal(true)}
            >
              <FileText size={17} />
              <span>Notices &amp; Schemes</span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={() => setShowAnalyticsModal(true)}
            >
              <TrendingUp size={17} />
              <span>Personal Analytics</span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={() => setShowNotifModal(true)}
            >
              <Bell size={17} />
              <span>Notifications</span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={() => setShowProfileModal(true)}
            >
              <User size={17} />
              <span>My Profile</span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={() => setShowInfoModal(true)}
            >
              <Info size={17} />
              <span>Portal Info</span>
            </button>
          </nav>
        </aside>

        {/* MAIN PANEL */}
        <main className="main-panel">
          <section className="panel-heading">
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>Citizen Overview</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
              Submit, track, and collaborate on civic issues and community projects.
            </p>
          </section>

          {/* STATS */}
          <section className="stats-row">
            <div className="metric-card">
              <span className="metric-title">Active Public Requests</span>
              <div className="metric-number">
                {communityStats.activePublicRequests}
              </div>
              <p className="metric-desc">Open for collaboration or under review</p>
            </div>
            <div className="metric-card">
              <span className="metric-title">Community Projects Ongoing</span>
              <div className="metric-number">
                {communityStats.communityProjectsOngoing}
              </div>
              <p className="metric-desc">Across various wards and categories</p>
            </div>
            <div className="metric-card">
              <span className="metric-title">Participating Citizens</span>
              <div className="metric-number">
                {communityStats.participatingCitizens}
              </div>
              <p className="metric-desc">Engaged across the community</p>
            </div>
          </section>

          {/* ISSUES TABLE & MAP */}
          <section className="split-section">
            <div className="box-card table-box" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="box-header" style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>My Submitted Issues</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (problems.length > 0) {
                      handleViewDetails(problems[0].id);
                    } else {
                      setShowReportModal(true);
                    }
                  }}
                  className="all-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#075844', fontWeight: 600, fontSize: '13px' }}
                >
                  View all issues &rarr;
                </button>
              </div>
              <div className="table-scroll" style={{ flex: 1 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ISSUE TITLE</th>
                      <th>STATUS</th>
                      <th>CATEGORY / LOCATION</th>
                      <th>ATTACHMENTS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280', fontSize: '13px' }}>
                          No civic problems reported yet. Click "Report New Problem" to submit.
                        </td>
                      </tr>
                    ) : (
                      problems.map((p) => (
                        <tr
                          key={p.id}
                          className={`issue-item ${selectedProblem?.id === p.id ? 'selected' : ''}`}
                          onClick={() => setSelectedProblem(p)}
                        >
                          <td>
                            <div className="issue-title-text" style={{ fontWeight: 600, color: '#111827' }}>{p.title}</div>
                            <div className="issue-meta-text" style={{ fontSize: '11px', color: '#6B7280' }}>
                              {p.code} &bull; {new Date(p.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill ${getStatusClass(p.status)}`}>{p.status}</span>
                          </td>
                          <td>
                            <div style={{ color: '#111827' }}>{p.category}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{p.location || p.ward}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: '#4B5563' }}>
                              {p.images && p.images.length > 0 ? `📷 ${p.images.length} file(s)` : '—'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                className="view-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(p.id);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#075844', fontWeight: 600, fontSize: '13px' }}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProblem(p.id, p.title);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#DC2626',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 4px',
                                  borderRadius: '3px'
                                }}
                                title="Withdraw / Delete Issue"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Requirement 1: Report New Problem button at the bottom-right corner of the card */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 18px', marginTop: 'auto', borderTop: '1px solid #F3F4F6' }}>
                <button
                  type="button"
                  className="report-btn-bottom-right"
                  onClick={() => setShowReportModal(true)}
                >
                  <PlusCircle size={16} />
                  <span>Report New Problem</span>
                </button>
              </div>
            </div>

            {/* Requirement 4: Problem Location Map */}
            <div className="box-card map-box" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="box-header" style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>Problem Location Map</h3>
              </div>
              <div style={{ flex: 1, minHeight: '440px', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <ProblemLocationMap
                  problems={publicProblems.length > 0 ? publicProblems : problems}
                  selectedProblem={selectedProblem}
                  onSelectProblem={(p) => {
                    setSelectedProblem(p);
                  }}
                />
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* MODAL 1: REPORT PROBLEM */}
      {showReportModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '720px' }}>
            <div className="modal-head">
              <div>
                <h3>Report a New Civic Problem</h3>
                <p>Submit geo-tagged civic issues directly to municipal departments and research universities.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowReportModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitProblem}>
              <div className="modal-content-form">
                {submitError && (
                  <div style={{ padding: '10px', background: '#FEE2E2', color: '#DC2626', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                    {submitError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Problem Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Streetlight outage along 4th Avenue corridor"
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Detailed Description *</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Describe exact conditions, hazards to pedestrians/traffic, duration of issue..."
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Category</label>
                    <select
                      value={reportForm.category}
                      onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    >
                      <option value="Public Infrastructure">Public Infrastructure</option>
                      <option value="Roadways">Roadways</option>
                      <option value="Sanitation">Sanitation</option>
                      <option value="Electricity & Power">Electricity & Power</option>
                      <option value="Water Supply">Water Supply</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Ward / Municipal Zone *</label>
                    <input
                      type="text"
                      required
                      value={reportForm.ward}
                      onChange={(e) => setReportForm({ ...reportForm, ward: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Specific Location</label>
                    <input
                      type="text"
                      placeholder="Near Gate 3, 4th Avenue"
                      value={reportForm.location}
                      onChange={(e) => setReportForm({ ...reportForm, location: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Affected Population</label>
                    <input
                      type="number"
                      min="1"
                      value={reportForm.affectedPopulation}
                      onChange={(e) => setReportForm({ ...reportForm, affectedPopulation: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Perceived Urgency</label>
                    <select
                      value={reportForm.urgency}
                      onChange={(e) => setReportForm({ ...reportForm, urgency: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Evidence Photos (Max 5)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                    style={{ width: '100%', padding: '6px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                {/* PRIORITY ANALYSIS & TRIAGE */}
                <div style={{ margin: '14px 0', padding: '12px', background: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#1E40AF' }}>Priority Analysis &amp; Duplicate Check</strong>
                      <p style={{ fontSize: '11px', color: '#3B82F6', margin: '2px 0 0 0' }}>Calculate automated priority score and detect duplicate reports before submitting.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePreScreen}
                      disabled={preScreenLoading}
                      style={{
                        padding: '6px 12px', background: '#2563EB', color: '#fff',
                        border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {preScreenLoading ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                  </div>

                  {aiAnalysis && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#1E3A8A' }}>
                      <p><strong>Assessment:</strong> {aiAnalysis.summary}</p>
                      <p><strong>Department:</strong> {aiAnalysis.department} &bull; <strong>Score:</strong> {aiAnalysis.priorityScore}/10 ({aiAnalysis.priorityLevel})</p>
                    </div>
                  )}

                  {duplicateMatch && (
                    <div style={{ marginTop: '8px', padding: '8px', background: '#FEF3C7', color: '#92400E', borderRadius: '4px', fontSize: '11px' }}>
                      ⚠️ <strong>Potential duplicate detected:</strong> "{duplicateMatch.title}" ({duplicateMatch.similarity}% similarity match).
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn-cancel" onClick={() => setShowReportModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PROBLEM DETAILS & TIMELINE */}
      {showDetailsModal && selectedProblem && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '680px' }}>
            <div className="modal-head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3>{selectedProblem.title}</h3>
                  <span className={`status-pill ${getStatusClass(selectedProblem.status)}`}>{selectedProblem.status}</span>
                </div>
                <p style={{ marginTop: '2px' }}>
                  Problem ID: <strong style={{ color: 'var(--color-primary)' }}>{selectedProblem.code}</strong> &bull; Reported {new Date(selectedProblem.created_at).toLocaleDateString()}
                </p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            <div className="modal-content-form">
              <div className="details-grid">
                <div className="details-card">
                  <span className="d-label">Category / Subcategory</span>
                  <strong className="d-value">{selectedProblem.category} &bull; {selectedProblem.subcategory || 'General'}</strong>
                </div>
                <div className="details-card">
                  <span className="d-label">Location / Ward</span>
                  <strong className="d-value">{selectedProblem.ward} ({selectedProblem.location})</strong>
                </div>
                <div className="details-card">
                  <span className="d-label">Severity &amp; Priority</span>
                  <strong className="d-value">Score {selectedProblem.priority_score}/10 &bull; {selectedProblem.priority_level}</strong>
                </div>
                <div className="details-card">
                  <span className="d-label">Assigned Council &amp; Dept</span>
                  <strong className="d-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {problemProgress?.council ? (
                      <span className="badge-council">
                        <Building2 size={12} /> {problemProgress.council.name}
                      </span>
                    ) : (
                      selectedProblem.assigned_department || 'Triage in progress'
                    )}
                  </strong>
                </div>
              </div>

              <div className="details-card" style={{ margin: '12px 0' }}>
                <span className="d-label">Problem Description</span>
                <p style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>{selectedProblem.description}</p>
              </div>

              {selectedProblem.ai_summary && (
                <div className="ai-summary-box" style={{ marginBottom: '12px', background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803D' }}>✨ AI Diagnostic Assessment</span>
                  <p style={{ marginTop: '4px', fontSize: '12px', color: '#166534' }}>{selectedProblem.ai_summary}</p>
                </div>
              )}

              {/* 7-Stage Official Civic Implementation Timeline */}
              <div style={{ margin: '14px 0' }}>
                <ProjectTimeline
                  status={selectedProblem.status}
                  council={problemProgress?.council}
                  project={problemProgress?.project}
                  challenge={problemProgress?.challenge}
                  publicUpdates={problemProgress?.publicUpdates || []}
                  showUpdates={true}
                />
              </div>

              {timeline.length > 0 && (
                <div style={{ marginTop: '16px', background: '#F9FAFB', padding: '10px', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Audit History:</span>
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: '6px', fontSize: '11px', color: '#4B5563' }}>
                    {timeline.map((h, i) => (
                      <li key={i} style={{ marginBottom: '4px', borderBottom: '1px dashed #E5E7EB', paddingBottom: '3px' }}>
                        <strong>{new Date(h.created_at).toLocaleDateString()}</strong>: {h.new_status} &bull; {h.remarks || 'Status logged'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleDeleteProblem(selectedProblem.id, selectedProblem.title)}
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
                  borderRadius: '4px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} />
                <span>Withdraw Grievance</span>
              </button>
              <button type="button" className="btn-cancel" onClick={() => setShowDetailsModal(false)}>Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NOTICES */}
      {showNoticesModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box notices-modal-box">
            <div className="modal-head">
              <div>
                <h3>Official Notices &amp; Government Schemes</h3>
                <p>Verified circulars, notifications, and active public welfare schemes.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowNoticesModal(false)}>✕</button>
            </div>

            <div className="modal-content-form">
              <div className="notices-list-container">
                {notices.map((n) => (
                  <div key={n.id} className="notice-card-item">
                    <div className={`notice-badge ${n.category === 'SCHEME' ? 'scheme-type' : 'notice-type'}`}>
                      {n.category}
                    </div>
                    <div className="notice-info">
                      <h4>{n.title}</h4>
                      <p>{n.summary}</p>
                      <div className="notice-meta">
                        <span>📅 {new Date(n.created_at).toLocaleDateString()} &bull; {n.publisher_department}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowNoticesModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ANALYTICS */}
      {showAnalyticsModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box analytics-modal-box">
            <div className="modal-head">
              <div>
                <h3>My Personal Civic Analytics</h3>
                <p>Real-time metrics and breakdown of grievances submitted under your account.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowAnalyticsModal(false)}>✕</button>
            </div>

            <div className="modal-content-form">
              <div className="stats-row modal-stats-row-4">
                <div className="metric-card">
                  <span className="metric-title">Total Reported</span>
                  <div className="metric-number">{stats.totalSubmitted}</div>
                  <p className="metric-desc">Lifetime submissions</p>
                </div>
                <div className="metric-card">
                  <span className="metric-title">Problems Solved</span>
                  <div className="metric-number">{stats.resolvedCount}</div>
                  <p className="metric-desc">Marked as resolved</p>
                </div>
                <div className="metric-card">
                  <span className="metric-title">In Progress</span>
                  <div className="metric-number">{stats.inProgressCount}</div>
                  <p className="metric-desc">In municipal pipeline</p>
                </div>
                <div className="metric-card">
                  <span className="metric-title">Resolution Rate</span>
                  <div className="metric-number">
                    {stats.totalSubmitted > 0 ? Math.round((stats.resolvedCount / stats.totalSubmitted) * 100) : 0}%
                  </div>
                  <p className="metric-desc">Verification percentage</p>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowAnalyticsModal(false)}>Close Analytics</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: NOTIFICATIONS */}
      {showNotifModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '580px' }}>
            <div className="modal-head">
              <div>
                <h3>Citizen Notifications</h3>
                <p>Live alerts on status changes, municipal reviews, and university projects.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowNotifModal(false)}>✕</button>
            </div>

            <div className="modal-content-form">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{unreadCount} unread notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkNotificationsRead}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '12px', padding: '20px' }}>No notifications found.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px', marginBottom: '8px',
                        background: n.is_read ? '#F9FAFB' : '#EFF6FF',
                        borderLeft: `4px solid ${n.is_read ? '#D1D5DB' : '#2563EB'}`,
                        borderRadius: '4px'
                      }}
                    >
                      <strong style={{ fontSize: '12px', display: 'block', color: '#1F2937' }}>{n.title}</strong>
                      <p style={{ fontSize: '12px', color: '#4B5563', margin: '3px 0' }}>{n.message}</p>
                      <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowNotifModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PROFILE */}
      {showProfileModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EDF5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#075844' }}>
                  <User size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Citizen Profile</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Personal account details and jurisdictional ward assignment.</p>
                </div>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>

            <div className="modal-content-form" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontWeight: 600, color: '#6B7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Full Name</label>
                    <div style={{ fontWeight: 600, color: '#111827', marginTop: '2px' }}>{user?.name || 'Verified Citizen'}</div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, color: '#6B7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Portal Role</label>
                    <div style={{ color: '#075844', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>{user?.role || 'Citizen'}</div>
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: 600, color: '#6B7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Official Email Address</label>
                  <div style={{ color: '#111827', marginTop: '2px' }}>{user?.email}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontWeight: 600, color: '#6B7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Mobile Contact</label>
                    <div style={{ color: '#111827', marginTop: '2px' }}>{user?.mobile || 'Not specified'}</div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, color: '#6B7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Registered Ward</label>
                    <div style={{ color: '#111827', marginTop: '2px' }}>{citizenProfile?.ward || 'Ward 12, Civil Lines'}</div>
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: 600, color: '#6B7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Residential Address / Area</label>
                  <div style={{ color: '#111827', marginTop: '2px' }}>{citizenProfile?.address || 'Civil Lines North, New Delhi'}</div>
                </div>

                <div style={{ padding: '12px', background: '#F8FAF9', borderRadius: '4px', fontSize: '11px', color: '#4B5563', borderLeft: '3px solid #075844' }}>
                  <strong>Civic Identity Status:</strong> Verified resident authorized to lodge geo-tagged grievances, track telemetry, and participate in local ward initiatives.
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: PORTAL INFO */}
      {showInfoModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '580px' }}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EDF5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#075844' }}>
                  <Info size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>About JanSetu Citizen Portal</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Government civic resolution and collaborative governance platform.</p>
                </div>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowInfoModal(false)}>✕</button>
            </div>

            <div className="modal-content-form" style={{ padding: '20px', fontSize: '13px', lineHeight: 1.5, color: '#374151' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#075844' }}>1. Report a Civic Problem</h4>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    Citizens can lodge complaints regarding sanitation, road hazards, streetlights, and drainage. Every issue is tagged with geo-coordinates and municipal ward details for fast routing.
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#075844' }}>2. Real-Time Tracking &amp; Telemetry</h4>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    Follow every step of your grievance from submission to municipal inspection, university capstone project assignment, and field resolution.
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#075844' }}>3. Interactive Ward Map</h4>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    View active community issues and ward boundaries in real time to prevent duplicate reporting and stay informed about your neighborhood.
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#075844' }}>4. Helpline &amp; Emergency Support</h4>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    For immediate civic emergencies (water mains burst, electrical hazards), contact the Municipal Civic Helpline at <strong>1800-11-2026</strong> or email <strong>support@jansetu.gov.in</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowInfoModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
