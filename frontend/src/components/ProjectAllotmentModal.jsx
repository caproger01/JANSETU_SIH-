import React, { useState, useEffect } from 'react';
import { X, Award, CheckCircle, Calendar, IndianRupee } from 'lucide-react';
import api from '../services/api';

export default function ProjectAllotmentModal({
  isOpen,
  onClose,
  project,
  onAllotted
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [leadMentor, setLeadMentor] = useState('');
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !project) return;

    setError(null);
    setSelectedPartnerId(project.university_id ? String(project.university_id) : '');
    setTargetDate(project.target_completion_date ? project.target_completion_date.split('T')[0] : '');
    setGrantAmount(project.allocated_grant || project.grant_amount || '100000');
    setLeadMentor(project.lead_mentor || '');
    setTeamName(project.team_name || '');

    setLoadingRec(true);
    api.getProjectPartnerRecommendations(project.id)
      .then(res => {
        if (res.ok && res.data.success) {
          const recData = res.data.data?.recommendations || res.data.data || {};
          const list = Array.isArray(recData) ? recData : (recData.universities || []);
          setRecommendations(list);
          // If no partner selected and recommendations exist, pre-select top
          if (!project.university_id && list.length > 0) {
            setSelectedPartnerId(String(list[0].id));
          }
        }
      })
      .catch(err => console.error('Failed to get partner recommendations:', err))
      .finally(() => setLoadingRec(false));
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPartnerId) {
      setError('Please select an implementation partner university.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.allotProject(project.id, {
        universityId: parseInt(selectedPartnerId, 10),
        targetCompletionDate: targetDate || null,
        allocatedGrant: grantAmount ? parseFloat(grantAmount) : null,
        leadMentor: leadMentor || null,
        teamName: teamName || null
      });

      if (res.ok && res.data.success) {
        if (onAllotted) onAllotted(res.data.data);
        onClose();
      } else {
        setError(res.data.message || 'Failed to allot project.');
      }
    } catch (err) {
      setError('An unexpected error occurred during project allotment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-dialog-custom modal-dialog-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>
            <Award size={20} color="#075844" />
            Allot Civic Implementation Project
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-custom">
            {error && (
              <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.8125rem' }}>
                {error}
              </div>
            )}

            {/* Project Summary */}
            <div style={{ padding: '0.875rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075844' }}>
                  {project.code || 'PROJECT'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Status: <strong>{project.status}</strong>
                </span>
              </div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#111827', fontWeight: 700 }}>
                {project.title}
              </h4>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#4b5563' }}>
                {project.description}
              </p>
            </div>

            {/* Partner Matching Recommendations */}
            <div className="form-group-custom">
              <label className="form-label-custom">
                Recommended University Partners (Multi-Factor Matching Engine)
              </label>
              {loadingRec ? (
                <div style={{ padding: '1rem', background: '#f9fafb', textAlign: 'center', fontSize: '0.8125rem', color: '#6b7280' }}>
                  Evaluating university expertise, ward proximity, and workload capacity...
                </div>
              ) : recommendations.length === 0 ? (
                <div style={{ padding: '1rem', background: '#f9fafb', textAlign: 'center', fontSize: '0.8125rem', color: '#6b7280' }}>
                  No automated recommendations found. Please verify university profiles.
                </div>
              ) : (
                <div className="partner-rec-grid">
                  {recommendations.map(p => {
                    const isSelected = String(p.id) === String(selectedPartnerId);
                    return (
                      <div
                        key={p.id}
                        className={`partner-rec-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedPartnerId(String(p.id))}
                      >
                        <div className="partner-rec-info">
                          <h4>{p.institution_name || p.name}</h4>
                          <p>
                            {p.department || 'Civic Engineering Dept'} | Campus: {p.campus || 'Main Campus'}
                          </p>
                          {p.reasons && p.reasons.length > 0 && (
                            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#047857' }}>
                              &bull; {p.reasons.join(' ')}
                            </div>
                          )}
                        </div>
                        <div className="partner-rec-score">
                          <span className="partner-score-badge">{p.matchScore}% Fit</span>
                          <span style={{ fontSize: '0.6875rem', color: isSelected ? '#075844' : '#9ca3af', fontWeight: 600 }}>
                            {isSelected ? 'SELECTED' : 'Click to select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Allotment Details Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group-custom">
                <label className="form-label-custom">
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Target Completion Date
                </label>
                <input
                  type="date"
                  className="form-input-custom"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                />
              </div>

              <div className="form-group-custom">
                <label className="form-label-custom">
                  <IndianRupee size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Approved Grant Allocation (INR)
                </label>
                <input
                  type="number"
                  className="form-input-custom"
                  value={grantAmount}
                  onChange={e => setGrantAmount(e.target.value)}
                  placeholder="e.g. 150000"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group-custom">
                <label className="form-label-custom">Lead Faculty Mentor (Optional)</label>
                <input
                  type="text"
                  className="form-input-custom"
                  value={leadMentor}
                  onChange={e => setLeadMentor(e.target.value)}
                  placeholder="e.g. Prof. A. Sharma"
                />
              </div>

              <div className="form-group-custom">
                <label className="form-label-custom">Implementation Team Name (Optional)</label>
                <input
                  type="text"
                  className="form-input-custom"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Team JalSetu Innovators"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer-custom">
            <button type="button" className="btn-gov-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-gov-primary" disabled={submitting || !selectedPartnerId}>
              <CheckCircle size={16} />
              {submitting ? 'Allotting Project...' : 'Confirm Official Allotment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
