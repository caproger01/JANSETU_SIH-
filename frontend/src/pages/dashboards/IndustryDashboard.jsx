import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Compass,
  Handshake,
  LayoutDashboard,
  TrendingUp,
  Building2,
  Award,
  CheckCircle2,
  FileText,
  ShieldCheck
} from 'lucide-react';
import '../../styles/industry-dashboard.css';

export default function IndustryDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'pledges' | 'insights'
  const [stats, setStats] = useState({ supportedProjects: 0, activePartnerships: 0, pendingProposals: 0, csrBudget: '₹ 2.5 Crore' });
  const [profile, setProfile] = useState({});
  const [discoverProjects, setDiscoverProjects] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  // Offer support modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [offerForm, setOfferForm] = useState({
    supportType: 'FUNDING',
    amountOrDetails: ''
  });
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const fetchIndustryData = async () => {
    setLoading(true);
    try {
      const [overviewRes, projectsRes] = await Promise.all([
        api.getIndustryOverview(),
        api.getIndustryDiscoverProjects()
      ]);

      if (overviewRes.ok && overviewRes.data.data) {
        setStats(overviewRes.data.data.stats || {});
        setProfile(overviewRes.data.data.profile || {});
        setMyOffers(overviewRes.data.data.myOffers || []);
      }

      if (projectsRes.ok && projectsRes.data.data) {
        setDiscoverProjects(projectsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load industry dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustryData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of JanSetu?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const handleOpenOfferModal = (proj) => {
    setSelectedProject(proj);
    setOfferForm({
      supportType: 'FUNDING',
      amountOrDetails: `₹ 2,50,000 Corporate CSR Grant for ${proj.title}`
    });
    setShowOfferModal(true);
  };

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    setSubmittingOffer(true);
    try {
      const res = await api.submitIndustrySupportOffer({
        projectId: selectedProject.id,
        supportType: offerForm.supportType,
        amountOrDetails: offerForm.amountOrDetails
      });

      if (res.ok && res.data.success) {
        alert('CSR Support offer pledged successfully! University project mentor has been notified.');
        setShowOfferModal(false);
        fetchIndustryData();
      } else {
        alert(res.data.message || 'Failed to submit offer.');
      }
    } catch (err) {
      console.error('Support offer error:', err);
      alert('Error submitting offer.');
    } finally {
      setSubmittingOffer(false);
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
              <p>Corporate Social Responsibility • {profile.company_name || 'Industry Portal'}</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
            <span>{user ? user.name : 'Corporate Partner'}</span>
          </div>
          <button
            type="button"
            className="logout-btn-header"
            onClick={() => setShowProfileModal(true)}
            title="Profile"
            style={{ marginRight: '6px' }}
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
          <li><Link to="/" style={{ opacity: 0.85 }}>Home</Link></li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', height: '100%', padding: '0 16px', fontSize: '14px', fontWeight: activeTab === 'overview' ? 700 : 500, borderBottom: activeTab === 'overview' ? '3px solid #FF9933' : '3px solid transparent' }}
            >
              Overview
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', height: '100%', padding: '0 16px', fontSize: '14px', fontWeight: activeTab === 'projects' ? 700 : 500, borderBottom: activeTab === 'projects' ? '3px solid #FF9933' : '3px solid transparent' }}
            >
              Discover Projects
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'pledges' ? 'active' : ''}`}
              onClick={() => setActiveTab('pledges')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', height: '100%', padding: '0 16px', fontSize: '14px', fontWeight: activeTab === 'pledges' ? 700 : 500, borderBottom: activeTab === 'pledges' ? '3px solid #FF9933' : '3px solid transparent' }}
            >
              My Pledged Support
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', height: '100%', padding: '0 16px', fontSize: '14px', fontWeight: activeTab === 'insights' ? 700 : 500, borderBottom: activeTab === 'insights' ? '3px solid #FF9933' : '3px solid transparent' }}
            >
              Compliance &amp; Insights
            </button>
          </li>
        </ul>
      </nav>

      <div className="breadcrumb-bar">
        <div className="breadcrumbs">
          <Link to="/industry" onClick={() => setActiveTab('overview')}>Industry Portal</Link>
          <span className="separator">&gt;</span>
          <span>
            {activeTab === 'projects' ? 'Civic Projects Seeking Corporate Partnership' :
             activeTab === 'pledges' ? 'My Pledged CSR Commitments' :
             activeTab === 'insights' ? 'CSR Compliance & Strategic Impact Analytics' :
             'Executive Corporate CSR Dashboard'}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#666' }}>Corporate CSR Co-Financing Network</span>
        </div>
      </div>

      <div className="dashboard-body">
        <aside className="sidebar">
          <div className="role-badge-box">
            <h2>Industry</h2>
            <span>CORPORATE / CSR PANEL</span>
          </div>
          <nav className="sidebar-menu">
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={18} color={activeTab === 'overview' ? '#075844' : undefined} />
              <span>Executive Overview</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <Compass size={18} color={activeTab === 'projects' ? '#075844' : undefined} />
              <span>Discover Projects ({discoverProjects.length})</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'pledges' ? 'active' : ''}`}
              onClick={() => setActiveTab('pledges')}
            >
              <Handshake size={18} color={activeTab === 'pledges' ? '#075844' : undefined} />
              <span>My Support ({myOffers.length})</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              <TrendingUp size={18} color={activeTab === 'insights' ? '#075844' : undefined} />
              <span>Compliance &amp; Insights</span>
            </button>
          </nav>
        </aside>

        <main className="main-panel">
          {/* SUBPAGE 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <section className="panel-heading">
                <h2>Corporate CSR &amp; Civic Co-Financing Hub</h2>
                <p>Back verified academic prototypes solving real-world municipal problems under Section 135 CSR.</p>
              </section>

              <section className="stats-row">
                <div className="metric-card" onClick={() => setActiveTab('projects')} style={{ cursor: 'pointer' }}>
                  <span className="metric-title">Available Projects</span>
                  <div className="metric-number">{discoverProjects.length}</div>
                  <p className="metric-desc">Seeking corporate co-financing</p>
                </div>
                <div className="metric-card" onClick={() => setActiveTab('pledges')} style={{ cursor: 'pointer' }}>
                  <span className="metric-title">Active Partnerships</span>
                  <div className="metric-number">{stats.activePartnerships}</div>
                  <p className="metric-desc">Backed with CSR grants</p>
                </div>
                <div className="metric-card" onClick={() => setActiveTab('pledges')} style={{ cursor: 'pointer' }}>
                  <span className="metric-title">Approved CSR Pledges</span>
                  <div className="metric-number">{myOffers.length}</div>
                  <p className="metric-desc">Co-financing agreements</p>
                </div>
                <div className="metric-card" onClick={() => setActiveTab('insights')} style={{ cursor: 'pointer' }}>
                  <span className="metric-title">Total CSR Capital Pool</span>
                  <div className="metric-number">{stats.csrBudget || '₹ 2.5 Crore'}</div>
                  <p className="metric-desc">Allocated under Schedule VII</p>
                </div>
              </section>

              {/* OVERVIEW SNAPSHOTS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px', width: '100%' }}>
                {/* Recent Projects Card */}
                <div className="box-card table-box" style={{ padding: '20px', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Top Civic Projects Seeking Backing</h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6B7280' }}>Verified academic prototypes with direct municipal utility</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('projects')}
                      style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontWeight: 700, fontSize: '12px', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      View All ({discoverProjects.length}) &rarr;
                    </button>
                  </div>

                  {discoverProjects.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                      No university projects currently seeking industry support.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {discoverProjects.slice(0, 3).map((p) => (
                        <div key={p.id} style={{ padding: '14px 16px', background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '15px', color: '#075844' }}>{p.title}</div>
                              <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>
                                🏛️ {p.institution_name} &bull; <span style={{ color: '#2563EB', fontWeight: 600 }}>Lead: {p.lead_mentor}</span>
                              </div>
                            </div>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#EFF6FF', color: '#1E40AF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                              {p.stage || 'PROTOTYPE'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #E5E7EB', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ fontSize: '12px' }}>
                              📍 <strong>{p.ward}</strong> &bull; <strong style={{ color: '#047857' }}>Grant Needed: {p.funding_needed || '₹ 4,50,000'}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenOfferModal(p)}
                              style={{
                                background: '#075844',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <Handshake size={13} /> Pledge Support &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* My Active Pledges & Audit Highlights */}
                <div className="box-card table-box" style={{ padding: '20px', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>My Active CSR Pledges</h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6B7280' }}>Co-financing agreements and legal CSR audit status</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pledges')}
                      style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontWeight: 700, fontSize: '12px', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      View All ({myOffers.length}) &rarr;
                    </button>
                  </div>

                  {myOffers.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '13px', background: '#FAFAFA', borderRadius: '6px', border: '1px dashed #D1D5DB' }}>
                      <p style={{ margin: 0 }}>No CSR support commitments pledged yet.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('projects')}
                        style={{ marginTop: '10px', padding: '6px 14px', background: '#075844', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        Browse Open Civic Projects &rarr;
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      {myOffers.slice(0, 2).map((o) => (
                        <div key={o.id} style={{ padding: '12px 14px', background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '14px', color: '#075844' }}>{o.project_title}</strong>
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: '#ECFDF5', color: '#047857' }}>
                              {o.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px' }}>
                            {o.institution_name} &bull; {o.support_type}: <strong>{o.amount_or_details}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Regulatory Quick Badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E5E7EB', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                      <CheckCircle2 size={16} /> <strong>MCA CSR-2 Audit Compliant:</strong> Verified digital trail for corporate disclosures.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF' }}>
                      <ShieldCheck size={16} /> <strong>Section 35(1)(ii) Eligible:</strong> Research grants qualify for corporate tax deductions.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SUBPAGE 2: DISCOVER PROJECTS */}
          {activeTab === 'projects' && (
            <>
              <section className="panel-heading">
                <h2>Discover Civic Innovation Projects</h2>
                <p>Municipal civic problems matched with academic engineering labs seeking corporate CSR sponsorship.</p>
              </section>

              <div className="box-card table-box" style={{ width: '100%', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '6px', overflow: 'hidden' }}>
                <div className="box-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Civic Projects Seeking Corporate Partnership ({discoverProjects.length})</h3>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>All proposals verified by JanSetu Municipal Authority</span>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>PROJECT TITLE &amp; DETAILS</th>
                        <th>UNIVERSITY LAB</th>
                        <th>WARD / CATEGORY</th>
                        <th>BUDGET NEEDED</th>
                        <th>PARTNER ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discoverProjects.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#6B7280' }}>
                            No university projects currently seeking industry support.
                          </td>
                        </tr>
                      ) : (
                        discoverProjects.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <strong style={{ fontSize: '15px', color: '#075844' }}>{p.title}</strong>
                              <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '3px', lineHeight: 1.4 }}>{p.description}</div>
                              <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>Lead: {p.lead_mentor} ({p.stage})</span>
                            </td>
                            <td>
                              <strong>{p.institution_name}</strong>
                              <div style={{ fontSize: '11px', color: '#6B7280' }}>{p.department}</div>
                            </td>
                            <td>{p.category}<br/><span style={{ fontSize: '11px', color: '#6B7280' }}>{p.ward}</span></td>
                            <td><strong style={{ color: '#047857' }}>{p.funding_needed || '₹ 4,50,000'}</strong></td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleOpenOfferModal(p)}
                                style={{
                                  padding: '8px 14px', background: '#075844', color: '#fff',
                                  border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                                }}
                              >
                                <Handshake size={14} /> Pledge Support &rarr;
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* SUBPAGE 3: MY PLEDGED COMMITMENTS */}
          {activeTab === 'pledges' && (
            <>
              <section className="panel-heading">
                <h2>My Pledged CSR Commitments</h2>
                <p>Track your organization's approved co-financing agreements, funding disbursements, and academic partners.</p>
              </section>

              <div className="box-card table-box" style={{ width: '100%', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '6px', overflow: 'hidden' }}>
                <div className="box-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Corporate CSR Commitments ({myOffers.length})</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('projects')}
                    style={{ background: '#075844', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Pledge New Support
                  </button>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>PROJECT</th>
                        <th>UNIVERSITY</th>
                        <th>SUPPORT TYPE</th>
                        <th>CONTRIBUTION DETAILS</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myOffers.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>No CSR support commitments pledged yet.</p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('projects')}
                              style={{ marginTop: '12px', padding: '6px 14px', background: '#075844', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Browse Civic Projects &rarr;
                            </button>
                          </td>
                        </tr>
                      ) : (
                        myOffers.map((o) => (
                          <tr key={o.id}>
                            <td><strong style={{ fontSize: '14px', color: '#075844' }}>{o.project_title}</strong></td>
                            <td>{o.institution_name}</td>
                            <td><span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{o.support_type}</span></td>
                            <td>{o.amount_or_details}</td>
                            <td>
                              <span style={{
                                padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                                background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0'
                              }}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* SUBPAGE 4: COMPLIANCE & INSIGHTS */}
          {activeTab === 'insights' && (
            <>
              <section className="panel-heading">
                <h2>CSR Compliance &amp; Strategic Impact Analytics</h2>
                <p>Official regulatory audit trail, Schedule VII alignment, and community impact indicators.</p>
              </section>

              <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', width: '100%' }}>
                {/* RECOMMENDED OPPORTUNITIES */}
                <div className="box-card" style={{ padding: '20px', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>RECOMMENDED CSR OPPORTUNITIES</h3>
                    <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700, background: '#ECFDF5', padding: '3px 8px', borderRadius: '4px' }}>
                      Schedule VII Fit
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div style={{ padding: '14px', background: '#F8FAF9', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#075844' }}>
                        <span style={{ fontSize: '15px' }}>Urban Storm Drainage Telemetry</span>
                        <span style={{ color: '#16A34A', fontSize: '11px', fontWeight: 700 }}>High CSR Priority</span>
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#555', lineHeight: 1.45 }}>
                        IoT water quality and automated back-flow sensors. Eligible under Schedule VII environment conservation.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px', color: '#666' }}>
                        <span>Lead: Delhi Technological University</span>
                        <strong style={{ color: '#075844' }}>Grant: ₹ 6,00,000</strong>
                      </div>
                    </div>
                    <div style={{ padding: '14px', background: '#F8FAF9', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#075844' }}>
                        <span style={{ fontSize: '15px' }}>Solid Waste Segregation Automation</span>
                        <span style={{ color: '#16A34A', fontSize: '11px', fontWeight: 700 }}>Sanitation CSR Fit</span>
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#555', lineHeight: 1.45 }}>
                        Computer vision sorting unit for community processing centers. Eligible under Swachh Bharat mission.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px', color: '#666' }}>
                        <span>Lead: IIT Delhi Urban Labs</span>
                        <strong style={{ color: '#075844' }}>Grant: ₹ 8,50,000</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PARTNERSHIP INSIGHTS & REGULATORY */}
                <div className="box-card" style={{ padding: '20px', background: '#fff', border: '1px solid #D8DDDD', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>REGULATORY FRAMEWORK &amp; IMPACT</h3>
                    <span style={{ fontSize: '11px', color: '#075844', fontWeight: 600, background: '#EDF5F2', padding: '3px 8px', borderRadius: '3px' }}>
                      CSR Analytics
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: 1.5 }}>
                    <div style={{ padding: '12px', background: '#F8FAF9', borderRadius: '6px', borderLeft: '4px solid #075844' }}>
                      <strong style={{ color: '#075844', display: 'block', marginBottom: '2px' }}>MCA CSR-2 Compliance Assurance:</strong>
                      100% of JanSetu municipal projects provide verified milestone reporting and third-party audit trail for annual MCA CSR-2 filings.
                    </div>
                    <div style={{ padding: '12px', background: '#F8FAF9', borderRadius: '6px', borderLeft: '4px solid #2563EB' }}>
                      <strong style={{ color: '#1E40AF', display: 'block', marginBottom: '2px' }}>Section 35(1)(ii) Tax Deduction:</strong>
                      Academic research grants to approved public institutions qualify under applicable Section 35(1)(ii) deduction norms.
                    </div>
                    <div style={{ padding: '12px', background: '#F8FAF9', borderRadius: '6px', borderLeft: '4px solid #16A34A' }}>
                      <strong style={{ color: '#16A34A', display: 'block', marginBottom: '2px' }}>Direct Civic Impact:</strong>
                      Your active pledges currently impact over 15,000 residents across monitored municipal zones.
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* MODAL: OFFER SUPPORT */}
      {showOfferModal && selectedProject && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '580px' }}>
            <div className="modal-head">
              <div>
                <h3>Pledge CSR Support for Project</h3>
                <p>{selectedProject.title} &bull; {selectedProject.institution_name}</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowOfferModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitOffer}>
              <div className="modal-content-form">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Support Category</label>
                  <select
                    value={offerForm.supportType}
                    onChange={(e) => setOfferForm({ ...offerForm, supportType: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  >
                    <option value="FUNDING">Corporate CSR Capital Grant</option>
                    <option value="EQUIPMENT">Hardware / Sensor Equipment Donated</option>
                    <option value="MENTORSHIP">Corporate Engineering Mentorship</option>
                    <option value="DEPLOYMENT_PARTNER">Site Deployment Partnership</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Contribution Value &amp; Logistics Details *</label>
                  <textarea
                    rows="3"
                    required
                    value={offerForm.amountOrDetails}
                    onChange={(e) => setOfferForm({ ...offerForm, amountOrDetails: e.target.value })}
                    placeholder="Specify grant amount, hardware specifications, corporate mentors assigned..."
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn-cancel" onClick={() => setShowOfferModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submittingOffer}>
                  {submittingOffer ? 'Recording Pledge...' : 'Confirm CSR Co-Financing Agreement'}
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
                <h3>Industry Partner Profile</h3>
                <p>Corporate Social Responsibility accreditation.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>

            <div className="modal-content-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Organization / Corporate Entity</label>
                  <div style={{ fontWeight: 600, color: '#222' }}>{profile.company_name || user?.name || 'Corporate Partner'}</div>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: '#555', display: 'block', fontSize: '12px' }}>Industry Sector</label>
                  <div style={{ color: '#222' }}>{profile.industry_sector || 'Infrastructure & Clean Technology'}</div>
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
                  Note: Corporate identity is bound to official CIN and verified CSR compliance records.
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
