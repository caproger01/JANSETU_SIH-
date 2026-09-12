import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  LayoutGrid,
  Map,
  Sparkles,
  Bell,
  GraduationCap,
  Building2,
  CheckCircle,
  CheckCircle2,
  Award,
  Clock,
  ShieldCheck,
  Briefcase,
  Upload
} from 'lucide-react';
import ProblemLocationMap from '../../components/ProblemLocationMap';
import CouncilAssignmentModal from '../../components/CouncilAssignmentModal';
import ProjectAllotmentModal from '../../components/ProjectAllotmentModal';
import ProjectVerificationModal from '../../components/ProjectVerificationModal';
import ProjectTimeline from '../../components/ProjectTimeline';
import '../../styles/citizen-dashboard.css';
import '../../styles/government-dashboard.css';

export default function GovernmentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('grievances'); // 'grievances' | 'projects' | 'councils' | 'research_projects'
  const [stats, setStats] = useState({ totalProblems: 0, resolvedCount: 0, criticalCount: 0, unassignedCount: 0, challengeCount: 0, activeProjects: 0, peopleImpacted: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [projects, setProjects] = useState([]);
  const [councilsWorkload, setCouncilsWorkload] = useState([]);

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCouncilModal, setShowCouncilModal] = useState(false);
  const [problemForCouncil, setProblemForCouncil] = useState(null);
  const [showAllotModal, setShowAllotModal] = useState(false);
  const [projectToAllot, setProjectToAllot] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [projectToVerify, setProjectToVerify] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineProject, setTimelineProject] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  // Research Project Milestones modal
  const [selectedResearchProject, setSelectedResearchProject] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', targetDate: '', remarks: '' });
  const [addingMilestone, setAddingMilestone] = useState(false);

  // Status update form
  const [updateStatus, setUpdateStatus] = useState('UNDER REVIEW');
  const [updateDept, setUpdateDept] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Challenge creation form
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    category: 'Civic Infrastructure',
    ward: 'Ward 12',
    location: 'District Wide',
    priorityLevel: 'HIGH',
    affectedPopulation: 1000,
    requiredExpertise: 'Civil Engineering, Hydraulic Systems',
    grantAmount: '₹ 5,00,000'
  });
  const [publishingChallenge, setPublishingChallenge] = useState(false);

  const fetchGovernmentData = async () => {
    setLoading(true);
    try {
      const [overviewRes, problemsRes, projectsRes, workloadRes] = await Promise.all([
        api.getGovernmentOverview(),
        api.getGovernmentProblems(),
        api.getGovernmentProjects(),
        api.getCouncilWorkload()
      ]);

      if (overviewRes.ok && overviewRes.data.data) {
        setStats(overviewRes.data.data.stats || {});
        if (overviewRes.data.data.categoryBreakdown) {
          setCategoryBreakdown(overviewRes.data.data.categoryBreakdown);
        }
      }

      if (problemsRes.ok && problemsRes.data.data) {
        setProblems(problemsRes.data.data || []);
        if (problemsRes.data.data.length > 0 && !selectedProblem) {
          setSelectedProblem(problemsRes.data.data[0]);
        }
      }

      if (projectsRes.ok && projectsRes.data.data) {
        setProjects(projectsRes.data.data || []);
      }

      if (workloadRes.ok && workloadRes.data.data) {
        setCouncilsWorkload(workloadRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load government dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernmentData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of JanSetu?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const handleOpenStatusModal = (prob) => {
    setSelectedProblem(prob);
    setUpdateStatus(prob.status);
    setUpdateDept(prob.assigned_department || '');
    setUpdateRemarks(prob.officer_remarks || '');
    setShowStatusModal(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedProblem) return;
    setSavingStatus(true);
    try {
      const res = await api.updateGovernmentProblemStatus(selectedProblem.id, {
        status: updateStatus,
        assignedDepartment: updateDept,
        officerRemarks: updateRemarks
      });

      if (res.ok && res.data.success) {
        alert('Grievance status successfully updated.');
        setShowStatusModal(false);
        fetchGovernmentData();
      } else {
        alert(res.data.message || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Status update error:', err);
      alert('Error updating status.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleOpenChallengeModal = (prob) => {
    setSelectedProblem(prob);
    setChallengeForm({
      title: prob ? `Research Challenge: ${prob.title}` : '',
      description: prob ? prob.description : '',
      category: prob ? prob.category : 'Civic Infrastructure',
      ward: prob ? prob.ward : 'Ward 12',
      location: prob ? prob.location : 'District Wide',
      priorityLevel: prob ? prob.priority_level : 'HIGH',
      affectedPopulation: prob ? prob.affected_population : 1000,
      requiredExpertise: 'Urban Engineering, Environmental Science',
      grantAmount: '₹ 7,50,000'
    });
    setShowChallengeModal(true);
  };

  const handlePublishChallenge = async (e) => {
    e.preventDefault();
    setPublishingChallenge(true);
    try {
      const res = await api.publishChallenge({
        problemId: selectedProblem ? selectedProblem.id : null,
        title: challengeForm.title,
        description: challengeForm.description,
        category: challengeForm.category,
        ward: challengeForm.ward,
        location: challengeForm.location,
        priorityLevel: challengeForm.priorityLevel,
        affectedPopulation: challengeForm.affectedPopulation,
        requiredExpertise: challengeForm.requiredExpertise.split(',').map(s => s.trim()),
        grantAmount: challengeForm.grantAmount
      });

      if (res.ok && res.data.success) {
        alert('University Innovation Challenge published successfully!');
        setShowChallengeModal(false);
        fetchGovernmentData();
      } else {
        alert(res.data.message || 'Failed to publish challenge.');
      }
    } catch (err) {
      console.error('Publish challenge error:', err);
      alert('Error publishing challenge.');
    } finally {
      setPublishingChallenge(false);
    }
  };

  const handleOpenAiInsights = async () => {
    setShowAiModal(true);
    if (!aiInsights) {
      try {
        const res = await api.getGovernmentAiInsights();
        if (res.ok && res.data.data) {
          setAiInsights(res.data.data);
        }
      } catch (err) {
        console.error('Ai insights error:', err);
      }
    }
  };

  const handleToggleMilestone = async (milestoneId, currentStatus) => {
    try {
      const res = await api.updateGovernmentProjectMilestone(milestoneId, {
        completed: !currentStatus
      });
      if (res.ok && res.data.success) {
        fetchGovernmentData();
      }
    } catch (err) {
      console.error('Milestone toggle error:', err);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!selectedResearchProject) return;
    setAddingMilestone(true);
    try {
      const res = await api.addGovernmentProjectMilestone(selectedResearchProject.id, milestoneForm);
      if (res.ok && res.data.success) {
        alert('Milestone added successfully.');
        setShowMilestoneModal(false);
        setMilestoneForm({ title: '', targetDate: '', remarks: '' });
        fetchGovernmentData();
      } else {
        alert(res.data?.message || 'Failed to add milestone.');
      }
    } catch (err) {
      console.error('Add milestone error:', err);
      alert('Error adding milestone.');
    } finally {
      setAddingMilestone(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'status-submitted';
      case 'UNDER REVIEW': return 'status-review';
      case 'OFFICER ASSIGNED': return 'status-assigned';
      case 'UNIVERSITY ASSIGNED': return 'status-university';
      case 'RESOLVED': return 'status-resolved';
      default: return 'status-submitted';
    }
  };

  return (
    <>
      <header className="top-header">
        <div className="header-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🇮🇳</span>
            <div>
              <h1>JanSetu</h1>
              <p>Government Command Center • Municipal Analytics &amp; Triage</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="avatar-button"
            onClick={handleOpenAiInsights}
            title="Civic Intelligence"
            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', width: 'auto', borderRadius: '4px', padding: '6px 12px' }}
          >
            Civic Intelligence
          </button>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {user ? user.name : 'Municipal Administrator'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-sub)' }}>Zonal Municipal Authority</span>
          </div>
          <button
            type="button"
            className="logout-btn-header"
            onClick={() => setShowProfileModal(true)}
            title="Official Profile"
            style={{ marginRight: '6px' }}
          >
            Profile
          </button>
          <button type="button" className="logout-btn-header" onClick={handleLogout} title="Sign Out">
            Logout
          </button>
        </div>
      </header>

      <nav className="top-nav" style={{ backgroundColor: '#075844', padding: '0 28px' }}>
        <ul className="nav-links" style={{ display: 'flex', gap: '24px', listStyle: 'none', margin: 0, padding: 0, alignItems: 'center' }}>
          <li>
            <Link to="/" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '14px', padding: '12px 0', display: 'inline-block', opacity: 0.9 }}>
              Home
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('grievances')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '12px 0',
                display: 'inline-block',
                fontWeight: (activeTab === 'grievances' || activeTab === 'projects' || activeTab === 'councils') ? 700 : 500,
                borderBottom: (activeTab === 'grievances' || activeTab === 'projects' || activeTab === 'councils') ? '3px solid #FF9933' : '3px solid transparent',
                cursor: 'pointer'
              }}
            >
              Government Command Center
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('research_projects')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '12px 0',
                display: 'inline-block',
                fontWeight: activeTab === 'research_projects' ? 700 : 500,
                borderBottom: activeTab === 'research_projects' ? '3px solid #FF9933' : '3px solid transparent',
                cursor: 'pointer'
              }}
            >
              Research Projects
            </button>
          </li>
        </ul>
      </nav>

      <div className="breadcrumb-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <span className="separator">&gt;</span>
          <Link to="/government" onClick={() => setActiveTab('grievances')}>Government</Link>
          <span className="separator">&gt;</span>
          <span>
            {activeTab === 'research_projects' ? 'Ongoing Civic Research Projects' : activeTab === 'projects' ? 'Civic Implementation Projects' : activeTab === 'councils' ? 'Council Jurisdictions' : 'Command Center & Grievance Stream'}
          </span>
        </div>
      </div>

      <div className="dashboard-body">
        <aside className="sidebar">
          <div className="role-badge-box">
            <h2>Authority</h2>
            <span>GOVT ADMIN PANEL</span>
          </div>
          <nav className="sidebar-menu">
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'grievances' ? 'active' : ''}`}
              onClick={() => setActiveTab('grievances')}
            >
              <LayoutGrid size={18} color={activeTab === 'grievances' ? '#075844' : undefined} />
              <span>Grievance Stream</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'research_projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('research_projects')}
            >
              <GraduationCap size={18} color={activeTab === 'research_projects' ? '#075844' : undefined} />
              <span>Research Projects ({projects.length})</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <Briefcase size={18} color={activeTab === 'projects' ? '#075844' : undefined} />
              <span>Civic Projects ({projects.length})</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'councils' ? 'active' : ''}`}
              onClick={() => setActiveTab('councils')}
            >
              <Building2 size={18} color={activeTab === 'councils' ? '#075844' : undefined} />
              <span>Council Jurisdictions</span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={() => {
                setActiveTab('grievances');
                setTimeout(() => {
                  const el = document.getElementById('problems-stream') || document.querySelector('.split-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              <Map size={18} />
              <span>GIS Heatmap Layer</span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={handleOpenAiInsights}
            >
              <Sparkles size={18} />
              <span>JanSetu AI Briefing</span>
            </button>
          </nav>
        </aside>

        <main className="main-panel">
          {/* TOP HEADER SECTION */}
          <section className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Municipal Analytics &amp; Grievance Stream
              </h2>
              <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                Real-time oversight tracking municipal efficiency, ward analytics, and citizen submissions synced from JanSetu portals
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleOpenAiInsights}
                style={{
                  background: '#075844',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <Sparkles size={16} />
                <span>View JanSetu AI Insights</span>
              </button>
            </div>
          </section>

          {/* 5 KPI STATS CARDS */}
          <section className="stats-row">
            <div className="metric-card">
              <span className="metric-title">Total Community Reports</span>
              <div className="metric-number">{stats.totalProblems || problems.length}</div>
              <p className="metric-desc">Synced from citizens</p>
            </div>
            <div className="metric-card">
              <span className="metric-title">Critical Problems</span>
              <div className="metric-number" style={{ color: '#DC2626' }}>{stats.criticalCount}</div>
              <p className="metric-desc">Severity &ge; 8</p>
            </div>
            <div className="metric-card">
              <span className="metric-title">Active Projects</span>
              <div className="metric-number" style={{ color: '#2563EB' }}>{stats.activeProjects || stats.challengeCount || 0}</div>
              <p className="metric-desc">Assigned to academia</p>
            </div>
            <div className="metric-card">
              <span className="metric-title">Resolved Problems</span>
              <div className="metric-number" style={{ color: '#16A34A' }}>{stats.resolvedCount}</div>
              <p className="metric-desc">Verified completed</p>
            </div>
            <div className="metric-card">
              <span className="metric-title">People Impacted</span>
              <div className="metric-number" style={{ color: '#075844' }}>
                {stats.peopleImpacted ? Number(stats.peopleImpacted).toLocaleString() + '+' : '4,650+'}
              </div>
              <p className="metric-desc">Across all wards</p>
            </div>
          </section>

          {activeTab === 'grievances' && (
            <>
              {/* UPPER SPLIT SECTION: MAP (LEFT) & CATEGORY BREAKDOWN DISTRIBUTION (RIGHT) */}
              <section className="split-section" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', alignItems: 'stretch' }}>
                {/* LEFT: Municipal GIS Geotag Map */}
                <div className="box-card" style={{ background: '#ffffff', border: '1px solid #D8DDDD', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#FAFAFA'
                  }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>
                      Municipal GIS Geotag Map
                    </h3>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#075844',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                      Live Citizen Coordinates
                    </span>
                  </div>
                  <div style={{ flex: 1, minHeight: '380px' }}>
                    <ProblemLocationMap
                      problems={problems}
                      selectedProblem={selectedProblem}
                      onSelectProblem={(prob) => setSelectedProblem(prob)}
                    />
                  </div>
                </div>

                {/* RIGHT: Category Breakdown Distribution */}
                <div className="box-card" style={{ background: '#ffffff', border: '1px solid #D8DDDD', borderRadius: '4px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>
                      Category Breakdown Distribution
                    </h3>
                    <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>
                      Civic Ingestion
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
                    {categoryBreakdown && categoryBreakdown.length > 0 ? (
                      categoryBreakdown.map((cat, idx) => {
                        const total = problems.length || 1;
                        const pct = Math.round(((cat.count || 0) / total) * 100);
                        return (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600, color: '#374151' }}>{cat.category}</span>
                              <span style={{ fontWeight: 600, color: '#111827' }}>{cat.count} ({pct}%)</span>
                            </div>
                            <div className="progress-bar-bg" style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  backgroundColor: idx === 0 ? '#075844' : idx === 1 ? '#10B981' : idx === 2 ? '#2563EB' : '#F59E0B',
                                  borderRadius: '4px'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#374151' }}>Civic Infrastructure</span>
                            <span style={{ fontWeight: 600, color: '#111827' }}>2 (50%)</span>
                          </div>
                          <div className="progress-bar-bg" style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                            <div className="progress-fill" style={{ width: '50%', height: '100%', backgroundColor: '#075844', borderRadius: '4px' }} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* LOWER FULL SECTION: LIVE GRIEVANCE STREAM (TABLE) */}
              <section id="problems-stream" className="box-card table-box" style={{ background: '#ffffff', border: '1px solid #D8DDDD', borderRadius: '4px', padding: '16px', marginBottom: '20px' }}>
                <div className="box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
                      Live Grievance Stream ({problems.length})
                    </h3>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>Real-time municipal grievance telemetry &amp; triage</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAiInsights}
                    style={{ background: '#075844', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Civic Intelligence Briefing
                  </button>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>CODE &amp; TITLE</th>
                        <th>WARD / CITIZEN</th>
                        <th>JURISDICTION COUNCIL</th>
                        <th>PRIORITY</th>
                        <th>STATUS</th>
                        <th>GOVERNANCE ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#6B7280' }}>
                            No grievances logged across municipal wards.
                          </td>
                        </tr>
                      ) : (
                        problems.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.title}</strong>
                              <div style={{ fontSize: '11px', color: '#6B7280' }}>{p.code} &bull; {new Date(p.created_at).toLocaleDateString()}</div>
                            </td>
                            <td>
                              {p.ward}
                              <div style={{ fontSize: '11px', color: '#6B7280' }}>By: {p.citizen_name || 'Citizen'}</div>
                            </td>
                            <td>
                              {p.assigned_council_name ? (
                                <span className="badge-council" title={`Dept: ${p.assigned_department_name || p.assigned_department || 'General'}`}>
                                  <Building2 size={12} /> {p.assigned_council_name}
                                </span>
                              ) : (
                                <span className="badge-council badge-council-unassigned">
                                  Council Pending
                                </span>
                              )}
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                {p.assigned_department_name || p.assigned_department || 'No dept assigned'}
                              </div>
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                                color: p.priority_level === 'CRITICAL' ? '#DC2626' : p.priority_level === 'HIGH' ? '#D97706' : '#2563EB',
                                background: p.priority_level === 'CRITICAL' ? '#FEE2E2' : p.priority_level === 'HIGH' ? '#FEF3C7' : '#EFF6FF'
                              }}>
                                {p.priority_level} ({p.priority_score})
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${getStatusClass(p.status)}`}>{p.status}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProblemForCouncil(p);
                                    setShowCouncilModal(true);
                                  }}
                                  style={{
                                    padding: '4px 8px', fontSize: '11px', background: '#075844',
                                    color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                  }}
                                  title="Assign Council"
                                >
                                  <Building2 size={12} />
                                  {p.assigned_council_id ? 'Reassign' : 'Assign Council'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(p)}
                                  style={{
                                    padding: '4px 8px', fontSize: '11px', background: '#ffffff',
                                    color: '#374151', border: '1px solid #D1D5DB', borderRadius: '3px', cursor: 'pointer', fontWeight: 500
                                  }}
                                >
                                  Status
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenChallengeModal(p)}
                                  style={{
                                    padding: '4px 8px', fontSize: '11px', background: '#2563EB',
                                    color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 600
                                  }}
                                >
                                  Formulate Project
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* SECTION 2: DEPARTMENT WORKLOAD & CATEGORY ANALYTICS */}
              <section id="departments-section" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginTop: '20px' }}>
                {/* DEPARTMENT WORKLOAD */}
                <div className="box-card" style={{ padding: '16px', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#222' }}>COUNCIL WORKLOAD &amp; DISPATCH</h3>
                    <span style={{ fontSize: '12px', color: '#666' }}>Active Municipal Operations</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F8FAF9', borderBottom: '1px solid #E5E7EB' }}>
                          <th style={{ padding: '8px' }}>COUNCIL</th>
                          <th style={{ padding: '8px' }}>OPEN CASES</th>
                          <th style={{ padding: '8px' }}>CRITICAL</th>
                          <th style={{ padding: '8px' }}>ACTIVE PROJECTS</th>
                          <th style={{ padding: '8px' }}>WORKLOAD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {councilsWorkload.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#6B7280' }}>
                          Loading municipal council telemetry...
                        </td>
                      </tr>
                    ) : (
                      councilsWorkload.slice(0, 6).map((cw) => {
                        const openCount = parseInt(cw.open_problems, 10) || 0;
                        const critCount = parseInt(cw.critical_problems, 10) || 0;
                        const loadLevel = critCount >= 2 ? 'CRITICAL' : openCount >= 5 ? 'HIGH' : openCount >= 2 ? 'MODERATE' : 'OPTIMAL';
                        const loadBg = loadLevel === 'CRITICAL' ? '#FEE2E2' : loadLevel === 'HIGH' ? '#FEF3C7' : '#DCFCE7';
                        const loadColor = loadLevel === 'CRITICAL' ? '#DC2626' : loadLevel === 'HIGH' ? '#D97706' : '#16A34A';
                        return (
                          <tr key={cw.id} style={{ borderBottom: '1px solid #EEE' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{cw.name}</td>
                            <td style={{ padding: '8px' }}>{openCount}</td>
                            <td style={{ padding: '8px', color: critCount > 0 ? '#DC2626' : '#111827', fontWeight: critCount > 0 ? 700 : 400 }}>{critCount}</td>
                            <td style={{ padding: '8px' }}>{cw.active_projects || 0} active</td>
                            <td style={{ padding: '8px' }}>
                              <span style={{ padding: '2px 6px', background: loadBg, color: loadColor, borderRadius: '3px', fontSize: '10px', fontWeight: 700 }}>
                                {loadLevel}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CIVIC INTELLIGENCE / ANOMALY ALERTS */}
                <div id="analytics-section" className="box-card" style={{ padding: '16px', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#222' }}>ESCALATIONS &amp; RISK ALERTS</h3>
                    <span style={{ fontSize: '11px', color: '#075844', fontWeight: 600, background: '#EDF5F2', padding: '2px 8px', borderRadius: '3px' }}>Civic Intelligence</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ padding: '10px', background: '#FEF2F2', borderLeft: '4px solid #DC2626', borderRadius: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: '#DC2626', fontWeight: 700 }}>CRITICAL SEVERITY</span>
                        <span style={{ color: '#666' }}>Automated Alert</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#333' }}>
                        {stats.criticalCount} high-priority grievances active across municipal wards requiring immediate intervention.
                      </p>
                    </div>

                    <div style={{ padding: '10px', background: '#FFFBEB', borderLeft: '4px solid #D97706', borderRadius: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: '#D97706', fontWeight: 700 }}>COUNCIL ALLOCATION</span>
                        <span style={{ color: '#666' }}>Pending Triage</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#333' }}>
                        Ensure all unassigned grievances are routed to their designated Municipal Council under the JanSetu charter.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* VIEW: CIVIC IMPLEMENTATION PROJECTS */}
          {activeTab === 'projects' && (
            <section className="box-card table-box" style={{ background: '#ffffff', border: '1px solid #D8DDDD', borderRadius: '4px', padding: '16px', marginBottom: '20px' }}>
              <div className="box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Civic Implementation Projects ({projects.length})
                  </h3>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    Official municipal implementation lifecycle from Council allotment to university execution and site verification
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenChallengeModal(null)}
                  style={{ background: '#075844', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Formulate Research Project Challenge
                </button>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PROJECT CODE &amp; TITLE</th>
                      <th>RESPONSIBLE COUNCIL</th>
                      <th>PARTNER UNIVERSITY</th>
                      <th>PROGRESS</th>
                      <th>TARGET DATE</th>
                      <th>STATUS</th>
                      <th>GOVERNANCE ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#6B7280' }}>
                          No implementation projects initialized yet. Formulate a challenge from grievances to start.
                        </td>
                      </tr>
                    ) : (
                      projects.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.title}</strong>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{p.code} &bull; Ward: {p.problem_ward || 'General'}</div>
                          </td>
                          <td>
                            <span className="badge-council">
                              <Building2 size={12} /> {p.council_name || 'Assigned Council'}
                            </span>
                          </td>
                          <td>
                            <strong>{p.institution_name || p.university_name || 'Unallotted'}</strong>
                            {p.team_name && <div style={{ fontSize: '11px', color: '#6B7280' }}>Team: {p.team_name}</div>}
                          </td>
                          <td style={{ minWidth: '120px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>
                              <span>{p.progress_percentage || 0}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, Math.max(0, p.progress_percentage || 0))}%`, height: '100%', backgroundColor: '#075844' }} />
                            </div>
                          </td>
                          <td>
                            {p.target_completion_date ? new Date(p.target_completion_date).toLocaleDateString() : 'Pending Allotment'}
                          </td>
                          <td>
                            <span className="badge-project-status badge-status-inprogress" style={{ textTransform: 'uppercase' }}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(!p.university_id || p.status === 'APPROVED') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProjectToAllot(p);
                                    setShowAllotModal(true);
                                  }}
                                  style={{
                                    padding: '4px 8px', fontSize: '11px', background: '#075844',
                                    color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 600
                                  }}
                                >
                                  Allot Project
                                </button>
                              )}
                              {(p.status === 'IN_PROGRESS' || p.status === 'SUBMITTED_FOR_VERIFICATION') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProjectToVerify(p);
                                    setShowVerifyModal(true);
                                  }}
                                  style={{
                                    padding: '4px 8px', fontSize: '11px', background: '#2563EB',
                                    color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 600
                                  }}
                                >
                                  Verify Project
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setTimelineProject(p);
                                  setShowTimelineModal(true);
                                }}
                                style={{
                                  padding: '4px 8px', fontSize: '11px', background: '#ffffff',
                                  color: '#374151', border: '1px solid #D1D5DB', borderRadius: '3px', cursor: 'pointer', fontWeight: 500
                                }}
                              >
                                Timeline
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* VIEW: ONGOING CIVIC RESEARCH PROJECTS (MATCHING SCREENSHOT) */}
          {activeTab === 'research_projects' && (
            <section className="section-card" style={{ background: '#ffffff', border: '1px solid #D8DDDD', borderRadius: '4px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid #E5E7EB', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    My Ongoing Civic Research Projects
                  </h2>
                  <span style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px', display: 'inline-block' }}>
                    Track team milestones and corporate support
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenChallengeModal(null)}
                  style={{
                    background: '#075844',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  + Formulate Research Project Challenge
                </button>
              </div>

              {projects.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>No civic research projects initialized yet.</p>
                  <p style={{ fontSize: '12px', marginTop: '6px' }}>Formulate a challenge from the Grievance Stream or allot an existing project to a university partner.</p>
                </div>
              ) : (
                projects.map((p) => {
                  const milestones = (p.milestones && p.milestones.length > 0) ? p.milestones : [
                    { id: `m1-${p.id}`, title: 'Feasibility Assessment & Problem Site Inspection (15 Days)', completed: false, remarks: 'Initial field survey and sensor requirement scoping.' },
                    { id: `m2-${p.id}`, title: 'Engineering Architecture & Lab Prototype Testing (45 Days)', completed: false, remarks: 'Fabrication and benchmark validation.' },
                    { id: `m3-${p.id}`, title: 'Municipal Deployment Pilot & Handover Evaluation (90 Days)', completed: false, remarks: 'Commissioning with municipal field staff.' }
                  ];

                  return (
                    <div
                      key={p.id}
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        padding: '18px',
                        marginBottom: '18px',
                        background: '#FAFAFA'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '17px', color: '#075844', fontWeight: 700 }}>
                            {p.title}
                          </h3>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                            Code: <strong>{p.code || 'PROJECT'}</strong> &bull; Team: <strong>{p.team_name || p.institution_name || 'IIT Roorkee Jal Innovation Lab'}</strong> &bull; Lead: <strong>{p.lead_mentor || 'Prof. S. K. Sharma'}</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#EFF6FF',
                              color: '#1E40AF',
                              border: '1px solid #BFDBFE',
                              textTransform: 'uppercase'
                            }}
                          >
                            {p.status || 'ACTIVE'}
                          </span>
                        </div>
                      </div>

                      {/* Ground Implementation Progress */}
                      <div style={{ margin: '14px 0 10px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                          <span>Ground Implementation Progress</span>
                          <span style={{ color: '#075844' }}>{p.progress_percentage || 0}% Completed</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, p.progress_percentage || 0))}%`,
                              height: '100%',
                              backgroundColor: '#075844',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>

                      <p style={{ fontSize: '13px', color: '#374151', margin: '10px 0' }}>
                        {p.description || 'Student research capstone prototype design'}
                      </p>

                      {/* Industry CSR Partner Banner */}
                      {(p.industry_offers && p.industry_offers.length > 0) ? (
                        <div style={{ margin: '10px 0', padding: '10px 14px', background: '#F0FDF4', borderRadius: '4px', border: '1px solid #BBF7D0', fontSize: '12px' }}>
                          <strong style={{ color: '#15803D' }}>🤝 Industry CSR Partner:</strong>{' '}
                          {p.industry_offers.map((o, idx) => (
                            <span key={idx} style={{ color: '#166534', fontWeight: 500 }}>
                              {o.company_name} ({o.support_type || 'FUNDING'}: {o.amount_or_details || '₹ 3,50,000 Corporate CSR grant for polymer mold fabrication'}) [{o.status || 'APPROVED'}]
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ margin: '10px 0', padding: '10px 14px', background: '#F0FDF4', borderRadius: '4px', border: '1px solid #BBF7D0', fontSize: '12px' }}>
                          <strong style={{ color: '#15803D' }}>🤝 Industry CSR Partner:</strong>{' '}
                          <span style={{ color: '#166534', fontWeight: 500 }}>
                            {p.industry_name ? `${p.industry_name} (FUNDING: ₹ 3,50,000 Corporate CSR grant for prototype deployment) [APPROVED]` : 'Tata Sustainability & Infrastructure Ltd. (FUNDING: ₹ 3,50,000 Corporate CSR grant for polymer mold fabrication) [APPROVED]'}
                          </span>
                        </div>
                      )}

                      {/* Execution Milestones */}
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#1F2937' }}>Execution Milestones:</strong>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setProjectToVerify(p);
                                setShowVerifyModal(true);
                              }}
                              style={{
                                background: '#075844',
                                border: 'none',
                                color: '#ffffff',
                                padding: '6px 14px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Upload size={13} /> Log Progress &amp; Request Verification
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedResearchProject(p);
                                setShowMilestoneModal(true);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#075844',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              + Add Milestone
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {milestones.map((m, mIdx) => (
                            <div
                              key={m.id || mIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                background: '#ffffff',
                                borderRadius: '4px',
                                border: '1px solid #E5E7EB',
                                fontSize: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={!!m.completed}
                                  onChange={() => typeof m.id === 'number' && handleToggleMilestone(m.id, m.completed)}
                                  style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                                />
                                <span style={{ textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? '#9CA3AF' : '#1F2937', fontWeight: 500 }}>
                                  {m.title} {m.target_date ? (m.title.includes('(') ? '' : `(${m.target_date})`) : ''}
                                </span>
                              </div>
                              {m.remarks && (
                                <span style={{ color: '#6B7280', fontSize: '12px' }}>
                                  {m.remarks}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {/* VIEW: COUNCIL JURISDICTIONS & WORKLOAD */}
          {activeTab === 'councils' && (
            <section className="box-card" style={{ padding: '16px', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '4px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Government Implementation Councils &amp; Dynamic Dispatch Balancer
                  </h3>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    12 Configurable Councils with automated problem categorization and AI confidence routing
                  </span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAF9', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '10px' }}>COUNCIL NAME &amp; CODE</th>
                      <th style={{ padding: '10px' }}>OPEN GRIEVANCES</th>
                      <th style={{ padding: '10px' }}>CRITICAL CASES</th>
                      <th style={{ padding: '10px' }}>ACTIVE PROJECTS</th>
                      <th style={{ padding: '10px' }}>COMPLETED PROJECTS</th>
                      <th style={{ padding: '10px' }}>CAPACITY STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {councilsWorkload.map((cw) => {
                      const openCount = parseInt(cw.open_problems, 10) || 0;
                      const critCount = parseInt(cw.critical_problems, 10) || 0;
                      const loadLevel = critCount >= 2 ? 'CRITICAL LOAD' : openCount >= 5 ? 'HIGH LOAD' : openCount >= 2 ? 'MODERATE' : 'OPTIMAL';
                      const loadBg = loadLevel.includes('CRITICAL') ? '#FEE2E2' : loadLevel.includes('HIGH') ? '#FEF3C7' : '#DCFCE7';
                      const loadColor = loadLevel.includes('CRITICAL') ? '#DC2626' : loadLevel.includes('HIGH') ? '#D97706' : '#16A34A';
                      return (
                        <tr key={cw.id} style={{ borderBottom: '1px solid #EEE' }}>
                          <td style={{ padding: '10px', fontWeight: 700 }}>
                            <div style={{ color: '#075844', fontSize: '13px' }}>{cw.name}</div>
                            <span style={{ fontSize: '10px', color: '#6B7280' }}>{cw.code}</span>
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600 }}>{openCount}</td>
                          <td style={{ padding: '10px', fontSize: '13px', color: critCount > 0 ? '#DC2626' : '#111827', fontWeight: 700 }}>{critCount}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{cw.active_projects || 0}</td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#16A34A', fontWeight: 600 }}>{cw.completed_projects || 0}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '3px 8px', background: loadBg, color: loadColor, borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              {loadLevel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* MODAL: UPDATE STATUS */}
      {showStatusModal && selectedProblem && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '540px' }}>
            <div className="modal-head">
              <div>
                <h3>Update Grievance: {selectedProblem.code}</h3>
                <p>{selectedProblem.title}</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowStatusModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveStatus}>
              <div className="modal-content-form">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Workflow Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER REVIEW">UNDER REVIEW</option>
                    <option value="OFFICER ASSIGNED">OFFICER ASSIGNED</option>
                    <option value="UNIVERSITY ASSIGNED">UNIVERSITY ASSIGNED</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Assigned Department</label>
                  <input
                    type="text"
                    value={updateDept}
                    onChange={(e) => setUpdateDept(e.target.value)}
                    placeholder="e.g. Public Works Department (PWD)"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Official Remarks (Visible to Citizen)</label>
                  <textarea
                    rows="3"
                    value={updateRemarks}
                    onChange={(e) => setUpdateRemarks(e.target.value)}
                    placeholder="Provide details on crew deployment, estimated repair timeline..."
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn-cancel" onClick={() => setShowStatusModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingStatus}>
                  {savingStatus ? 'Saving...' : 'Save & Dispatch Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH CHALLENGE */}
      {showChallengeModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '640px' }}>
            <div className="modal-head">
              <div>
                <h3>Publish University Innovation Challenge</h3>
                <p>Convert civic bottlenecks into student engineering capstones with grant funding.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowChallengeModal(false)}>✕</button>
            </div>

            <form onSubmit={handlePublishChallenge}>
              <div className="modal-content-form">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Challenge Title *</label>
                  <input
                    type="text"
                    required
                    value={challengeForm.title}
                    onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                    placeholder="e.g. Sustainable Stormwater Drainage & Gravity Filtration"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Problem Scope &amp; Deliverables *</label>
                  <textarea
                    rows="3"
                    required
                    value={challengeForm.description}
                    onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                    placeholder="Technical requirements, target validation site, expected sensor telemetry..."
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Category</label>
                    <input
                      type="text"
                      value={challengeForm.category}
                      onChange={(e) => setChallengeForm({ ...challengeForm, category: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Grant / Budget Support</label>
                    <input
                      type="text"
                      value={challengeForm.grantAmount}
                      onChange={(e) => setChallengeForm({ ...challengeForm, grantAmount: e.target.value })}
                      placeholder="e.g. ₹ 8,50,000"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Required Academic Expertise (comma separated)</label>
                  <input
                    type="text"
                    value={challengeForm.requiredExpertise}
                    onChange={(e) => setChallengeForm({ ...challengeForm, requiredExpertise: e.target.value })}
                    placeholder="e.g. Hydraulic Engineering, Urban Drainage, IoT Sensors"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn-cancel" onClick={() => setShowChallengeModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={publishingChallenge}>
                  {publishingChallenge ? 'Publishing...' : 'Publish Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CIVIC INTELLIGENCE BRIEFING */}
      {showAiModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '640px' }}>
            <div className="modal-head">
              <div>
                <h3>Civic Intelligence &amp; Strategic Municipal Briefing</h3>
                <p>Automated spatial clustering, seasonal risks, and university recommendations.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowAiModal(false)}>✕</button>
            </div>

            <div className="modal-content-form">
              {aiInsights ? (
                <div>
                  <div style={{ background: '#F0FDF4', padding: '14px', borderRadius: '6px', border: '1px solid #BBF7D0', marginBottom: '14px' }}>
                    <strong style={{ color: '#15803D', fontSize: '13px' }}>Executive Observations:</strong>
                    <ul style={{ margin: '8px 0 0 18px', color: '#166534', fontSize: '12px', lineHeight: 1.5 }}>
                      {aiInsights.aiExecutiveBriefing.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#F9FAFB', padding: '10px', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                      <strong style={{ fontSize: '12px', color: '#374151' }}>Top Ward Hot-Spots:</strong>
                      <ul style={{ margin: '6px 0 0 16px', fontSize: '11px', color: '#4B5563' }}>
                        {aiInsights.wardClusters.map((w, i) => (
                          <li key={i}>{w.ward}: {w.count} grievances (Avg Score {Number(w.avg_priority).toFixed(1)})</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: '#F9FAFB', padding: '10px', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                      <strong style={{ fontSize: '12px', color: '#374151' }}>Category Frequency:</strong>
                      <ul style={{ margin: '6px 0 0 16px', fontSize: '11px', color: '#4B5563' }}>
                        {aiInsights.categoryBreakdown.map((c, i) => (
                          <li key={i}>{c.category}: {c.count} reports</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>Loading Municipal Intelligence...</div>
              )}
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowAiModal(false)}>Close Briefing</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROFILE */}
      {showProfileModal && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div className="modal-head">
              <div>
                <h3>Government Official Profile</h3>
                <p>Zonal municipal authority credentials.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>

            <div className="modal-content-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Officer Name</label>
                  <div style={{ fontWeight: 600, color: '#222' }}>{user?.name || 'Municipal Administrator'}</div>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Designation / Department</label>
                  <div style={{ color: '#222' }}>Zonal Municipal Commissioner • Public Works &amp; Civic Redressal</div>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Official Portal Email</label>
                  <div style={{ color: '#222' }}>{user?.email}</div>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>System Access Level</label>
                  <div style={{ color: '#075844', fontWeight: 700, textTransform: 'uppercase' }}>{user?.role} (COMMAND CENTER FULL ACCESS)</div>
                </div>
                <div style={{ padding: '10px', background: '#F8FAF9', borderRadius: '4px', fontSize: '11px', color: '#666', borderLeft: '3px solid #075844' }}>
                  Note: Government privileges are restricted to verified municipal authorities with immutable cryptographic roles.
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* COUNCIL ASSIGNMENT MODAL */}
      <CouncilAssignmentModal
        isOpen={showCouncilModal}
        onClose={() => setShowCouncilModal(false)}
        problem={problemForCouncil}
        onAssigned={() => {
          fetchGovernmentData();
        }}
      />

      {/* PROJECT ALLOTMENT MODAL */}
      <ProjectAllotmentModal
        isOpen={showAllotModal}
        onClose={() => setShowAllotModal(false)}
        project={projectToAllot}
        onAllotted={() => {
          fetchGovernmentData();
        }}
      />

      {/* PROJECT VERIFICATION MODAL */}
      <ProjectVerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        project={projectToVerify}
        onVerified={() => {
          fetchGovernmentData();
        }}
      />

      {/* PROJECT TIMELINE MODAL */}
      {showTimelineModal && timelineProject && (
        <div className="modal-backdrop-custom" onClick={() => setShowTimelineModal(false)}>
          <div className="modal-dialog-custom modal-dialog-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3>
                <Clock size={20} color="#075844" />
                Project Implementation Lifecycle: {timelineProject.code}
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowTimelineModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body-custom">
              <ProjectTimeline
                status={timelineProject.status}
                council={{ name: timelineProject.council_name, department: timelineProject.department_name }}
                project={timelineProject}
                publicUpdates={[]}
              />
            </div>
            <div className="modal-footer-custom">
              <button type="button" className="btn-gov-secondary" onClick={() => setShowTimelineModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MILESTONE MODAL */}
      {showMilestoneModal && selectedResearchProject && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div className="modal-head">
              <div>
                <h3>Add Milestone to Project</h3>
                <p>{selectedResearchProject.title}</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowMilestoneModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMilestone}>
              <div className="modal-content-form">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Milestone Title</label>
                  <input
                    type="text"
                    required
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Field Hydraulic Sensor Installation & Calibration"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Target Timeline / Duration</label>
                  <input
                    type="text"
                    required
                    value={milestoneForm.targetDate}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, targetDate: e.target.value }))}
                    placeholder="e.g. 30 Days or 2026-10-15"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Deliverable / Remarks</label>
                  <input
                    type="text"
                    value={milestoneForm.remarks}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="e.g. Installation of 12 IoT water level probe arrays."
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '12px 16px', borderTop: '1px solid #E5E7EB' }}>
                <button type="button" onClick={() => setShowMilestoneModal(false)} style={{ padding: '8px 16px', border: '1px solid #D1D5DB', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={addingMilestone} style={{ padding: '8px 16px', border: 'none', background: '#075844', color: '#fff', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
                  {addingMilestone ? 'Adding...' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
