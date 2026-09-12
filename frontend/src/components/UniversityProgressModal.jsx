import React, { useState } from 'react';
import { X, Upload, CheckCircle } from 'lucide-react';
import api from '../services/api';

export default function UniversityProgressModal({
  isOpen,
  onClose,
  project,
  onProgressSubmitted
}) {
  const [updateTitle, setUpdateTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(
    project?.progress_percentage ? Math.min(100, project.progress_percentage + 20) : 25
  );
  const [requestVerification, setRequestVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!updateTitle.trim() || !description.trim()) {
      setError('Please provide a milestone title and description of work completed.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.submitUniversityProjectProgress(project.id, {
        updateTitle,
        description,
        progressPercentage: parseInt(progressPercentage, 10),
        requestVerification
      });

      if (res.ok && res.data.success) {
        if (onProgressSubmitted) onProgressSubmitted(res.data.data);
        onClose();
      } else {
        setError(res.data.message || 'Failed to submit progress update.');
      }
    } catch (err) {
      setError('An unexpected error occurred while logging progress.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-dialog-custom" onClick={e => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>
            <Upload size={20} color="#075844" />
            Submit Implementation Milestone Progress
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
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075844' }}>
                {project.code}
              </span>
              <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '0.9375rem', color: '#111827', fontWeight: 700 }}>
                {project.title}
              </h4>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Milestone / Progress Title *</label>
              <input
                type="text"
                className="form-input-custom"
                value={updateTitle}
                onChange={e => setUpdateTitle(e.target.value)}
                placeholder="e.g. Phase 2 Pilot Deployment &amp; Field Sensor Calibration"
                required
              />
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Work Completed &amp; Ground Evidence *</label>
              <textarea
                className="form-textarea-custom"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe specific engineering tasks completed, materials installed, testing data recorded..."
                required
              />
            </div>

            <div className="form-group-custom">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <label className="form-label-custom">Overall Project Completion Percentage</label>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#075844' }}>
                  {progressPercentage}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressPercentage}
                onChange={e => setProgressPercentage(e.target.value)}
                style={{ width: '100%', accentColor: '#075844' }}
              />
            </div>

            <label className="form-checkbox-custom">
              <input
                type="checkbox"
                checked={requestVerification}
                onChange={e => setRequestVerification(e.target.checked)}
              />
              <span>
                <strong>Request Official Government Verification:</strong> Check this if work is ready for municipal field inspection and final project sign-off.
              </span>
            </label>
          </div>

          <div className="modal-footer-custom">
            <button type="button" className="btn-gov-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-gov-primary" disabled={submitting}>
              <CheckCircle size={16} />
              {submitting ? 'Submitting...' : 'Record Progress Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
