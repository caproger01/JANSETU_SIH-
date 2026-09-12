import React, { useState, useEffect } from 'react';
import { X, Building2, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function CouncilAssignmentModal({
  isOpen,
  onClose,
  problem,
  onAssigned
}) {
  const [councils, setCouncils] = useState([]);
  const [selectedCouncilId, setSelectedCouncilId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('MEDIUM');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !problem) return;

    setError(null);
    setSelectedCouncilId(problem.assigned_council_id ? String(problem.assigned_council_id) : '');
    setSelectedDeptId(problem.assigned_department_id ? String(problem.assigned_department_id) : '');
    setPriorityLevel(problem.priority_level || 'MEDIUM');
    setNotes(problem.council_assignment_notes || '');
    setConfirmed(false);

    // Fetch Councils
    api.getCouncils().then(res => {
      if (res.ok && res.data.success) {
        setCouncils(res.data.data);
      }
    });

    // Fetch AI recommendation
    setLoadingRec(true);
    api.getProblemCouncilRecommendation(problem.id)
      .then(res => {
        if (res.ok && res.data.success) {
          setRecommendation(res.data.data.recommendation);
        }
      })
      .catch(err => console.error('Failed to get recommendation:', err))
      .finally(() => setLoadingRec(false));
  }, [isOpen, problem]);

  if (!isOpen || !problem) return null;

  const currentCouncilObj = councils.find(c => String(c.id) === String(selectedCouncilId));
  const availableDepartments = currentCouncilObj?.departments || [];

  const handleApplyRecommendation = () => {
    if (!recommendation || !recommendation.council) return;
    setSelectedCouncilId(String(recommendation.council.id));
    if (recommendation.department) {
      setSelectedDeptId(String(recommendation.department.id));
    }
    setNotes(`Assigned via AI Municipal Matcher (${recommendation.confidence}% confidence): ${recommendation.reasons?.join(', ') || ''}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCouncilId) {
      setError('Please select a responsible Government Council.');
      return;
    }
    if (!confirmed) {
      setError('Please confirm official jurisdictional allotment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.assignCouncilToProblem(problem.id, {
        councilId: parseInt(selectedCouncilId, 10),
        departmentId: selectedDeptId ? parseInt(selectedDeptId, 10) : null,
        priorityLevel,
        notes
      });

      if (res.ok && res.data.success) {
        if (onAssigned) onAssigned(res.data.data);
        onClose();
      } else {
        setError(res.data.message || 'Failed to assign council.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-dialog-custom modal-dialog-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>
            <Building2 size={20} color="#075844" />
            Official Council &amp; Department Allocation
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

            {/* Problem Details Banner */}
            <div style={{ padding: '0.875rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075844', background: '#e6f4ea', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {problem.code}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Ward: <strong>{problem.ward || 'General'}</strong> | Category: <strong>{problem.category}</strong>
                </span>
              </div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#111827', fontWeight: 700 }}>
                {problem.title}
              </h4>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.4 }}>
                {problem.description}
              </p>
            </div>

            {/* AI Recommendation Box */}
            {loadingRec ? (
              <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center', fontSize: '0.8125rem', color: '#065f46' }}>
                Evaluating municipal jurisdictional mappings...
              </div>
            ) : recommendation && recommendation.council ? (
              <div className="ai-recommendation-box">
                <div className="ai-rec-header">
                  <span className="ai-rec-title">AI Jurisdictional Recommendation</span>
                  <span className="ai-rec-badge">{recommendation.confidence}% Match Confidence</span>
                </div>
                <div className="ai-rec-content">
                  <div className="ai-rec-council">{recommendation.council.name} ({recommendation.council.code})</div>
                  {recommendation.department && (
                    <div className="ai-rec-dept">Recommended Department: {recommendation.department.name}</div>
                  )}
                  {recommendation.reasons && recommendation.reasons.length > 0 && (
                    <ul className="ai-rec-reasons">
                      {recommendation.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    className="btn-apply-rec"
                    onClick={handleApplyRecommendation}
                  >
                    <CheckCircle size={14} /> Apply Recommendation to Allocation Form
                  </button>
                </div>
              </div>
            ) : null}

            {/* Official Assignment Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group-custom">
                <label className="form-label-custom">Responsible Council *</label>
                <select
                  className="form-select-custom"
                  value={selectedCouncilId}
                  onChange={e => {
                    setSelectedCouncilId(e.target.value);
                    setSelectedDeptId('');
                  }}
                  required
                >
                  <option value="">-- Select Responsible Council --</option>
                  {councils.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-custom">
                <label className="form-label-custom">Executing Department</label>
                <select
                  className="form-select-custom"
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                  disabled={!selectedCouncilId || availableDepartments.length === 0}
                >
                  <option value="">-- Optional / General Department --</option>
                  {availableDepartments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Official Priority Level</label>
              <select
                className="form-select-custom"
                value={priorityLevel}
                onChange={e => setPriorityLevel(e.target.value)}
              >
                <option value="CRITICAL">CRITICAL (Immediate Action)</option>
                <option value="HIGH">HIGH (Urgent Municipal Work)</option>
                <option value="MEDIUM">MEDIUM (Standard Queue)</option>
                <option value="LOW">LOW (Scheduled Routine)</option>
              </select>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Administrative Directives &amp; Assignment Notes</label>
              <textarea
                className="form-textarea-custom"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Specify execution instructions, field inspection mandates, or scope..."
              />
            </div>

            <label className="form-checkbox-custom">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
              />
              <span>
                I hereby confirm official jurisdictional allotment of this citizen grievance under the JanSetu Civic Governance Charter.
              </span>
            </label>
          </div>

          <div className="modal-footer-custom">
            <button type="button" className="btn-gov-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-gov-primary" disabled={submitting || !confirmed || !selectedCouncilId}>
              <ShieldCheck size={16} />
              {submitting ? 'Allocating...' : 'Confirm Council Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
