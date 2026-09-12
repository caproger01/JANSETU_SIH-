import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import api from '../services/api';

export default function ProjectVerificationModal({
  isOpen,
  onClose,
  project,
  onVerified
}) {
  const [decision, setDecision] = useState('VERIFIED');
  const [qualityScore, setQualityScore] = useState(5);
  const [siteInspectionNotes, setSiteInspectionNotes] = useState('');
  const [resolveProblem, setResolveProblem] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!siteInspectionNotes.trim()) {
      setError('Please provide officer inspection remarks and evidence notes.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.verifyProject(project.id, {
        decision,
        qualityScore,
        siteInspectionNotes,
        resolveProblem
      });

      if (res.ok && res.data.success) {
        if (onVerified) onVerified(res.data.data);
        onClose();
      } else {
        setError(res.data.message || 'Failed to record verification.');
      }
    } catch (err) {
      setError('An error occurred during verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-dialog-custom" onClick={e => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>
            <CheckCircle size={20} color="#075844" />
            Official Site Inspection &amp; Project Verification
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

            <div style={{ padding: '0.875rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                <span>{project.code}</span>
                <span>University: <strong>{project.institution_name || project.university_name}</strong></span>
              </div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', color: '#111827', fontWeight: 700 }}>
                {project.title}
              </h4>
              <div style={{ fontSize: '0.8125rem', color: '#075844', fontWeight: 600 }}>
                Reported Progress: {project.progress_percentage || 0}%
              </div>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Verification Decision *</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="VERIFIED"
                    checked={decision === 'VERIFIED'}
                    onChange={() => setDecision('VERIFIED')}
                    accentColor="#075844"
                  />
                  <strong>Approve &amp; Verify (Satisfactory Completion)</strong>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="REJECTED"
                    checked={decision === 'REJECTED'}
                    onChange={() => setDecision('REJECTED')}
                    accentColor="#dc2626"
                  />
                  <span style={{ color: '#dc2626' }}>Reject / Requires Revision</span>
                </label>
              </div>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Execution Quality Score (1 to 5)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                    onClick={() => setQualityScore(star)}
                  >
                    <Star
                      size={24}
                      fill={star <= qualityScore ? '#f59e0b' : 'none'}
                      color={star <= qualityScore ? '#f59e0b' : '#d1d5db'}
                    />
                  </button>
                ))}
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4b5563', marginLeft: '0.5rem' }}>
                  {qualityScore} of 5 Stars
                </span>
              </div>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Site Inspection &amp; Physical Verification Notes *</label>
              <textarea
                className="form-textarea-custom"
                rows={4}
                value={siteInspectionNotes}
                onChange={e => setSiteInspectionNotes(e.target.value)}
                placeholder="Detail physical site condition, testing results, community impact, and officer sign-off..."
                required
              />
            </div>

            {decision === 'VERIFIED' && (
              <label className="form-checkbox-custom">
                <input
                  type="checkbox"
                  checked={resolveProblem}
                  onChange={e => setResolveProblem(e.target.checked)}
                />
                <span>
                  Mark the associated citizen grievance as officially <strong>RESOLVED</strong> and notify the citizen.
                </span>
              </label>
            )}
          </div>

          <div className="modal-footer-custom">
            <button type="button" className="btn-gov-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-gov-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Official Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
