import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Upload,
  CheckCircle,
  Award,
  Building2,
  Target,
  Briefcase,
  Users,
  Lightbulb,
  LayoutDashboard
} from 'lucide-react';
import UniversityProgressModal from '../../components/UniversityProgressModal';
import '../../styles/university-dashboard.css';

export default function UniversityDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('challenges'); // 'challenges' | 'projects' | 'teams' | 'insights' | 'overview'
  const [stats, setStats] = useState({ openChallenges: 0, activeProjects: 0, completedMilestones: 0, industryPartnerships: 0 });
  const [profile, setProfile] = useState({});
  const [activeProjects, setActiveProjects] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [projectForProgress, setProjectForProgress] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // Accept Form
  const [acceptForm, setAcceptForm] = useState({
    projectTitle: '',
    description: '',
    leadMentor: '',
    teamName: '',
    fundingNeeded: ''
  });
  const [accepting, setAccepting] = useState(false);

  // Milestone Form
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    targetDate: '',
    remarks: ''
  });
  const [addingMilestone, setAddingMilestone] = useState(false);

  const fetchUniversityData = async () => {
    setLoading(true);
    try {
      const [overviewRes, challengesRes, univProjectsRes] = await Promise.all([
        api.getUniversityOverview(),
        api.getUniversityChallenges(),
        api.getUniversityProjects()
      ]);

      if (overviewRes.ok && overviewRes.data.data) {
        setStats(overviewRes.data.data.stats || {});
        setProfile(overviewRes.data.data.profile || {});
        
        const overviewProjs = overviewRes.data.data.activeProjects || [];
        const allottedProjs = (univProjectsRes.ok && univProjectsRes.data.data) ? univProjectsRes.data.data : [];
        const combined = [...overviewProjs];
        allottedProjs.forEach(ap => {
          if (!combined.some(cp => cp.id === ap.id)) {
            combined.push(ap);
          }
        });
        setActiveProjects(combined);
      }

      if (challengesRes.ok && challengesRes.data.data) {
        setChallenges(challengesRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load university dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversityData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of JanSetu?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const handleOpenAcceptModal = (ch) => {
    setSelectedChallenge(ch);
    setAcceptForm({
      projectTitle: `Solution: ${ch.title}`,
      description: ch.description,
      leadMentor: user ? user.name : 'Faculty Mentor',
      teamName: `${profile.institution_name || 'University'} Lab Team`,
      fundingNeeded: ch.grant_amount || '₹ 5,00,000'
    });
    setShowAcceptModal(true);
  };

  const handleAcceptChallenge = async (e) => {
    e.preventDefault();
    if (!selectedChallenge) return;
    setAccepting(true);
    try {
      const res = await api.acceptUniversityChallenge({
        challengeId: selectedChallenge.id,
        projectTitle: acceptForm.projectTitle,
        description: acceptForm.description,
        leadMentor: acceptForm.leadMentor,
        teamName: acceptForm.teamName,
        fundingNeeded: acceptForm.fundingNeeded,
        studentMembers: [
          { name: 'Research Scholar Lead', role: 'Technical Lead' },
          { name: 'Senior M.Tech Student', role: 'Simulation Engineer' }
        ]
      });

      if (res.ok && res.data.success) {
        alert('Challenge accepted! Capstone project initialized.');
        setShowAcceptModal(false);
        fetchUniversityData();
      } else {
        alert(res.data.message || 'Failed to accept challenge.');
      }
    } catch (err) {
      console.error('Accept challenge error:', err);
      alert('Error accepting challenge.');
    } finally {
      setAccepting(false);
    }
  };

  const handleToggleMilestone = async (milestoneId, currentStatus) => {
    try {
      const res = await api.updateProjectMilestone(milestoneId, {
        completed: !currentStatus
      });
      if (res.ok && res.data.success) {
        fetchUniversityData();
      }
    } catch (err) {
      console.error('Milestone toggle error:', err);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    setAddingMilestone(true);
    try {
      const res = await api.addProjectMilestone(selectedProject.id, milestoneForm);
      if (res.ok && res.data.success) {
        alert('Milestone added.');
        setShowMilestoneModal(false);
        setMilestoneForm({ title: '', targetDate: '', remarks: '' });
        fetchUniversityData();
      }
    } catch (err) {
      console.error('Add milestone error:', err);
    } finally {
      setAddingMilestone(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🇮🇳</span>
            <div>
              <div className="brand-name">JanSetu</div>
              <div className="brand-subtitle">University Research &amp; Innovation Hub • {profile.institution_name || 'Academic Portal'}</div>
            </div>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#075844' }}>
              {user ? user.name : 'University Account'}
            </span>
            <span style={{ fontSize: '11px', color: '#555555' }}>
              {profile.institution_name || 'Academic Innovation Hub'}
            </span>
          </div>
          <button
            type="button"
            className="top-nav-btn top-nav-btn-profile"
            onClick={() => setShowProfileModal(true)}
            title="View Institution Profile"
            style={{ background: '#EDF5F2', color: '#075844', border: '1px solid #C8DDD7', fontSize: '12px', padding: '6px 14px' }}
          >
            Profile
          </button>
          <button type="button" className="logout-btn-header" onClick={handleLogout} title="Sign Out">
            Logout
          </button>
        </div>
      </header>

      <nav className="top-nav">
        <ul className="nav-links">
          <li>
            <Link to="/" className="nav-link" style={{ opacity: 0.85 }}>Home</Link>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'challenges' ? 'active' : ''}`}
              onClick={() => setActiveTab('challenges')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Challenges ({challenges.length})
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              My Projects ({activeProjects.length})
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'teams' ? 'active' : ''}`}
              onClick={() => setActiveTab('teams')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Teams
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Insights
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Overview
            </button>
          </li>
        </ul>
      </nav>

      <div className="breadcrumb-bar">
        <div className="breadcrumbs">
          <Link to="/university" onClick={() => setActiveTab('challenges')}>University Portal</Link>
          <span className="separator">&gt;</span>
          <span>
            {activeTab === 'challenges' ? 'Recommended Challenges' :
             activeTab === 'projects' ? 'My Ongoing Civic Research Projects' :
             activeTab === 'teams' ? 'Research Teams & Faculty Mentorship' :
             activeTab === 'insights' ? 'Research & Innovation Insights' :
             'Executive Research Dashboard'}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#666' }}>Academic Innovation Network</span>
        </div>
      </div>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <h2>JanSetu</h2>
            <span>UNIVERSITY HUB</span>
          </div>
          <ul className="sidebar-menu">
            <li>
              <button
                type="button"
                className={`sidebar-link ${activeTab === 'challenges' ? 'active' : ''}`}
                onClick={() => setActiveTab('challenges')}
              >
                <Target size={18} color={activeTab === 'challenges' ? '#075844' : undefined} />
                <span>Challenges ({challenges.length})</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-link ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveTab('projects')}
              >
                <Briefcase size={18} color={activeTab === 'projects' ? '#075844' : undefined} />
                <span>My Ongoing Civic Projects ({activeProjects.length})</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-link ${activeTab === 'teams' ? 'active' : ''}`}
                onClick={() => setActiveTab('teams')}
              >
                <Users size={18} color={activeTab === 'teams' ? '#075844' : undefined} />
                <span>Teams</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-link ${activeTab === 'insights' ? 'active' : ''}`}
                onClick={() => setActiveTab('insights')}
              >
                <Lightbulb size={18} color={activeTab === 'insights' ? '#075844' : undefined} />
                <span>Insights</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <LayoutDashboard size={18} color={activeTab === 'overview' ? '#075844' : undefined} />
                <span>Executive Overview</span>
              </button>
            </li>
          </ul>
        </aside>

        <main className="main-content">
          {/* SUBPAGE 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <div className="main-header">
                <h1>University Research &amp; Capstone Portal</h1>
                <p>Direct academic challenges from municipal corporations paired with CSR corporate sponsorship.</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card" onClick={() => setActiveTab('challenges')} style={{ cursor: 'pointer' }}>
                  <div className="stat-number">{stats.openChallenges}</div>
                  <div className="stat-label">Open Challenges</div>
                </div>
                <div className="stat-card" onClick={() => setActiveTab('projects')} style={{ cursor: 'pointer' }}>
                  <div className="stat-number">{stats.activeProjects}</div>
                  <div className="stat-label">Active Research Projects</div>
                </div>
                <div className="stat-card" onClick={() => setActiveTab('projects')} style={{ cursor: 'pointer' }}>
                  <div className="stat-number">{stats.completedMilestones}</div>
                  <div className="stat-label">Milestones Completed</div>
                </div>
                <div className="stat-card" onClick={() => setActiveTab('insights')} style={{ cursor: 'pointer' }}>
                  <div className="stat-number">{stats.industryPartnerships}</div>
                  <div className="stat-label">Industry CSR Partners</div>
                </div>
              </div>

              {/* Overview Snapshots */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px', marginTop: '12px', width: '100%' }}>
                {/* Recent Challenges Card */}
                <div className="section-card">
                  <div className="section-header">
                    <div>
                      <h2>Recent Municipal Challenges</h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                        Priority municipal problems open for university capstone &amp; research solutions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('challenges')}
                      style={{
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#047857',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      View All ({challenges.length}) &rarr;
                    </button>
                  </div>

                  {challenges.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                      No challenges currently published.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {challenges.slice(0, 4).map((c) => (
                        <div
                          key={c.id}
                          style={{
                            padding: '16px 18px',
                            background: '#FAFAFA',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#E5E7EB', color: '#374151', textTransform: 'uppercase' }}>
                                  {c.code || 'CHALLENGE'}
                                </span>
                                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
                                  {c.category || 'Municipal Innovation'}
                                </span>
                              </div>
                              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#075844', lineHeight: 1.35 }}>
                                {c.title}
                              </h3>
                            </div>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              background: '#ECFDF5',
                              color: '#047857',
                              border: '1px solid #A7F3D0',
                              whiteSpace: 'nowrap'
                            }}>
                              {c.ai_match_percentage}% Match
                            </span>
                          </div>

                          {c.description && (
                            <p style={{ margin: 0, fontSize: '13px', color: '#4B5563', lineHeight: 1.45 }}>
                              {c.description.length > 130 ? `${c.description.slice(0, 130)}...` : c.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px dashed #E5E7EB', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px' }}>
                              <span style={{ color: '#4B5563' }}>
                                📍 <strong>{c.ward}</strong> ({c.location || 'City'})
                              </span>
                              <span style={{ color: '#047857', fontWeight: 700 }}>
                                💰 Grant: {c.grant_amount || '₹ 5,00,000'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenAcceptModal(c)}
                              style={{
                                background: '#075844',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Accept Challenge &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Civic Projects Card */}
                <div className="section-card">
                  <div className="section-header">
                    <div>
                      <h2>Active Civic Research Projects</h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                        Field execution progress, student teams, and prototype testing
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('projects')}
                      style={{
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#1E40AF',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      View All ({activeProjects.length}) &rarr;
                    </button>
                  </div>

                  {activeProjects.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                      No active projects yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {activeProjects.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: '16px 18px',
                            background: '#FAFAFA',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#F1F5F9', color: '#475569', textTransform: 'uppercase' }}>
                                  {p.code || 'PROJECT'}
                                </span>
                                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                  Team: <strong>{p.team_name || 'Academic Lab Team'}</strong>
                                </span>
                              </div>
                              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#075844', lineHeight: 1.35 }}>
                                {p.title}
                              </h3>
                            </div>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#EFF6FF',
                              color: '#1E40AF',
                              border: '1px solid #BFDBFE',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap'
                            }}>
                              {p.status || p.stage || 'ACTIVE'}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                              <span style={{ color: '#4B5563' }}>Field Implementation Progress</span>
                              <span style={{ color: '#075844', fontWeight: 700 }}>{p.progress_percentage || 0}%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(0, p.progress_percentage || 0))}%`,
                                  height: '100%',
                                  background: '#075844',
                                  borderRadius: '4px',
                                  transition: 'width 0.4s ease'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px dashed #E5E7EB', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ fontSize: '13px', color: '#4B5563' }}>
                              👨‍🏫 Mentor: <strong>{p.lead_mentor || 'Faculty Lead'}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setProjectForProgress(p);
                                setShowProgressModal(true);
                              }}
                              style={{
                                background: '#075844',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <Upload size={13} /> Update Progress
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* SUBPAGE 2: CHALLENGES */}
          {activeTab === 'challenges' && (
            <>
              <div className="main-header">
                <h1>Recommended Research Challenges</h1>
                <p>Municipal civic problems matched against {profile.department || 'Civil & Environmental Engineering'} with CSR co-financing grants.</p>
              </div>

              <div className="section-card" id="challenges-section" style={{ marginBottom: '24px' }}>
                <div className="section-header">
                  <h2>Open Municipal Innovation Challenges ({challenges.length})</h2>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Calculated against academic department lab capabilities</span>
                </div>
                <table className="challenge-table">
                  <thead>
                    <tr>
                      <th>CHALLENGE</th>
                      <th>WARD / LOCATION</th>
                      <th>GRANT</th>
                      <th>MATCH SCORE</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challenges.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>No challenges published yet.</td>
                      </tr>
                    ) : (
                      challenges.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong>{c.title}</strong>
                            <div style={{ fontSize: '11px', color: '#4B5563' }}>{c.code} &bull; {c.category}</div>
                          </td>
                          <td>{c.ward} ({c.location})</td>
                          <td><strong>{c.grant_amount}</strong></td>
                          <td>
                            <span style={{
                              padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                              background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0'
                            }}>
                              {c.ai_match_percentage}% Match
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${c.status === 'OPEN' ? 'pending' : 'active'}`}>{c.status}</span>
                          </td>
                          <td>
                            {c.status === 'OPEN' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenAcceptModal(c)}
                                style={{
                                  padding: '5px 10px', background: '#075844', color: '#fff',
                                  border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
                                }}
                              >
                                Accept Challenge &rarr;
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>Active Project</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* SUBPAGE 3: ONGOING CIVIC PROJECTS */}
          {activeTab === 'projects' && (
            <>
              <div className="main-header">
                <h1>My Ongoing Civic Research Projects</h1>
                <p>Track team execution milestones, engineering field prototypes, and corporate CSR co-financing support.</p>
              </div>

              <div className="section-card">
                <div className="section-header">
                  <h2>Active Projects &amp; Milestones ({activeProjects.length})</h2>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Track team milestones and corporate support</span>
                </div>

                {activeProjects.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>No active projects yet.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('challenges')}
                      style={{ marginTop: '12px', padding: '6px 14px', background: '#075844', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Browse Open Challenges &rarr;
                    </button>
                  </div>
                ) : (
                  activeProjects.map((p) => (
                    <div key={p.id} style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '16px', marginBottom: '16px', background: '#FAFAFA' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', color: '#075844' }}>{p.title}</h3>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            Code: <strong>{p.code || 'PROJECT'}</strong> &bull; Team: <strong>{p.team_name || 'Academic Capstone Team'}</strong> &bull; Lead: {p.lead_mentor || 'Faculty Lead'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                            background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', textTransform: 'uppercase'
                          }}>
                            {p.status || p.stage || 'ACTIVE'}
                          </span>
                        </div>
                      </div>

                      {/* Implementation Progress Bar */}
                      <div style={{ margin: '12px 0 8px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                          <span>Ground Implementation Progress</span>
                          <span style={{ color: '#075844' }}>{p.progress_percentage || 0}% Completed</span>
                        </div>
                        <div className="timeline-progress-bar-wrap" style={{ margin: 0 }}>
                          <div className="timeline-progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, p.progress_percentage || 0))}%` }} />
                        </div>
                      </div>

                      <p style={{ fontSize: '13px', color: '#374151', margin: '10px 0' }}>{p.description}</p>

                      {/* CSR Support Offers */}
                      {p.industry_offers && p.industry_offers.length > 0 && (
                        <div style={{ margin: '10px 0', padding: '8px 12px', background: '#F0FDF4', borderRadius: '4px', border: '1px solid #BBF7D0', fontSize: '12px' }}>
                          <strong style={{ color: '#15803D' }}>🤝 Industry CSR Partner:</strong>{' '}
                          {p.industry_offers.map((o, idx) => (
                            <span key={idx} style={{ color: '#166534' }}>
                              {o.company_name} ({o.support_type}: {o.amount_or_details}) [{o.status}]
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Milestones list & Actions */}
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#1F2937' }}>Execution Milestones:</strong>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setProjectForProgress(p);
                                setShowProgressModal(true);
                              }}
                              style={{
                                background: '#075844',
                                border: 'none',
                                color: '#fff',
                                padding: '5px 12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <Upload size={13} /> Log Progress &amp; Request Verification
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProject(p);
                                setShowMilestoneModal(true);
                              }}
                              style={{ background: 'none', border: 'none', color: '#075844', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              + Add Milestone
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {p.milestones && p.milestones.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 12px', background: '#fff', borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={m.completed}
                                  onChange={() => handleToggleMilestone(m.id, m.completed)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? '#9CA3AF' : '#1F2937' }}>
                                  {m.title} ({m.target_date})
                                </span>
                              </div>
                              {m.remarks && <span style={{ color: '#6B7280', fontSize: '11px' }}>{m.remarks}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* SUBPAGE 4: RESEARCH TEAMS */}
          {activeTab === 'teams' && (
            <>
              <div className="main-header">
                <h1>Research Teams &amp; Faculty Mentorship</h1>
                <p>Active department scholars, laboratory equipment allocations, and faculty mentors.</p>
              </div>

              <div className="section-card" id="teams-section" style={{ marginBottom: '24px' }}>
                <div className="section-header">
                  <h2>Research Teams &amp; Faculty Mentorship</h2>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Active department scholars and lab allocations</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ padding: '14px', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#F8FAF9' }}>
                    <div style={{ fontWeight: 700, color: '#075844', fontSize: '14px' }}>Civil &amp; Environmental Lab</div>
                    <div style={{ fontSize: '12px', color: '#555', margin: '4px 0' }}>Mentor: Dr. R. K. Sharma, Professor</div>
                    <div style={{ fontSize: '12px', color: '#444' }}>Scholars: 4 PG Students, 2 Post-docs</div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>Active Capstones: 2 Projects</div>
                  </div>
                  <div style={{ padding: '14px', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#F8FAF9' }}>
                    <div style={{ fontWeight: 700, color: '#075844', fontSize: '14px' }}>IoT &amp; Smart Grid Cell</div>
                    <div style={{ fontSize: '12px', color: '#555', margin: '4px 0' }}>Mentor: Dr. Ananya Sen, Associate Prof</div>
                    <div style={{ fontSize: '12px', color: '#444' }}>Scholars: 6 B.Tech Honours, 1 Research Associate</div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>Active Capstones: 1 Project</div>
                  </div>
                  <div style={{ padding: '14px', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#F8FAF9' }}>
                    <div style={{ fontWeight: 700, color: '#075844', fontSize: '14px' }}>Urban Hydraulics Workshop</div>
                    <div style={{ fontSize: '12px', color: '#555', margin: '4px 0' }}>Mentor: Prof. V. Narayanan, HOD</div>
                    <div style={{ fontSize: '12px', color: '#444' }}>Scholars: 3 Ph.D Candidates</div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>Preparing New Proposals</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SUBPAGE 5: INNOVATION INSIGHTS */}
          {activeTab === 'insights' && (
            <>
              <div className="main-header">
                <h1>Research &amp; Innovation Insights</h1>
                <p>Academic analytics, high-compatibility opportunities, and municipal technology adoption pathways.</p>
              </div>

              <div className="section-card" id="insights-section" style={{ marginBottom: '24px' }}>
                <div className="section-header">
                  <h2>Research &amp; Innovation Insights</h2>
                  <span style={{ fontSize: '11px', color: '#075844', fontWeight: 600, background: '#EDF5F2', padding: '2px 8px', borderRadius: '3px' }}>Academic Analytics</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div style={{ padding: '12px', background: '#F8FAF9', borderRadius: '4px', borderLeft: '3px solid #075844' }}>
                    <strong>High-Compatibility Opportunities:</strong> Municipal corporations are currently prioritizing storm drainage and sensor-monitored water conservation. Challenge fit score exceeds 80% for current department equipment.
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAF9', borderRadius: '4px', borderLeft: '3px solid #2563EB' }}>
                    <strong>CSR Co-Financing Available:</strong> 3 registered industrial partners have active CSR funds open for urban sustainability prototypes. Pledges can be claimed upon milestone 1 sign-off.
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODAL: ACCEPT CHALLENGE */}
      {showAcceptModal && selectedChallenge && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '600px' }}>
            <div className="modal-head">
              <div>
                <h3>Accept Innovation Challenge: {selectedChallenge.code}</h3>
                <p>{selectedChallenge.title}</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowAcceptModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAcceptChallenge}>
              <div className="modal-content-form">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Project Title</label>
                  <input
                    type="text"
                    required
                    value={acceptForm.projectTitle}
                    onChange={(e) => setAcceptForm({ ...acceptForm, projectTitle: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Research Methodology &amp; Approach</label>
                  <textarea
                    rows="3"
                    required
                    value={acceptForm.description}
                    onChange={(e) => setAcceptForm({ ...acceptForm, description: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Faculty Lead / Mentor</label>
                    <input
                      type="text"
                      required
                      value={acceptForm.leadMentor}
                      onChange={(e) => setAcceptForm({ ...acceptForm, leadMentor: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Team Name</label>
                    <input
                      type="text"
                      required
                      value={acceptForm.teamName}
                      onChange={(e) => setAcceptForm({ ...acceptForm, teamName: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Project Budget Request</label>
                  <input
                    type="text"
                    value={acceptForm.fundingNeeded}
                    onChange={(e) => setAcceptForm({ ...acceptForm, fundingNeeded: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn-cancel" onClick={() => setShowAcceptModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={accepting}>
                  {accepting ? 'Initializing Project...' : 'Confirm Acceptance & Launch Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MILESTONE */}
      {showMilestoneModal && selectedProject && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div className="modal-head">
              <div>
                <h3>Add Milestone to Project</h3>
                <p>{selectedProject.title}</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowMilestoneModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddMilestone}>
              <div className="modal-content-form">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Milestone Title *</label>
                  <input
                    type="text"
                    required
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                    placeholder="e.g. Field sensor telemetry calibration"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Target Date / Window</label>
                  <input
                    type="text"
                    value={milestoneForm.targetDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
                    placeholder="e.g. 15 Oct 2026"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Remarks &amp; Scope</label>
                  <input
                    type="text"
                    value={milestoneForm.remarks}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, remarks: e.target.value })}
                    placeholder="e.g. Bench testing in hydraulic laboratory"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn-cancel" onClick={() => setShowMilestoneModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={addingMilestone}>
                  {addingMilestone ? 'Adding...' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROFILE */}
      {showProfileModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div className="modal-head">
              <div>
                <h3>University Portal Profile</h3>
                <p>Verified academic institution accreditation.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>

            <div className="modal-content-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Institution Name</label>
                  <div style={{ fontWeight: 600, color: '#222' }}>{profile.institution_name || user?.name || 'Academic Institution'}</div>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Department / Centre</label>
                  <div style={{ color: '#222' }}>{profile.department || 'Civil & Environmental Engineering'}</div>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Official Portal Email</label>
                  <div style={{ color: '#222' }}>{user?.email}</div>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Assigned System Role</label>
                  <div style={{ color: '#075844', fontWeight: 700, textTransform: 'uppercase' }}>{user?.role}</div>
                </div>
                <div style={{ padding: '10px', background: '#F8FAF9', borderRadius: '4px', fontSize: '11px', color: '#666', borderLeft: '3px solid #075844' }}>
                  Note: Role assignment is locked to your verified educational institution domain.
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT PROJECT PROGRESS */}
      <UniversityProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        project={projectForProgress}
        onProgressSubmitted={() => {
          fetchUniversityData();
        }}
      />
    </>
  );
}
