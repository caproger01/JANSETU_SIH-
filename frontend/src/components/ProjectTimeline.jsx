import React from 'react';
import { Check, Clock, AlertCircle, Building2, Award } from 'lucide-react';

export default function ProjectTimeline({
  status = 'SUBMITTED',
  council = null,
  project = null,
  challenge = null,
  publicUpdates = [],
  showUpdates = true
}) {
  const steps = [
    { key: 'REPORTED', title: '1. Lodged', desc: 'Citizen Grievance Recorded' },
    { key: 'COUNCIL', title: '2. Council Assigned', desc: council ? council.name : 'Jurisdiction Pending' },
    { key: 'CHALLENGE', title: '3. Challenge Formed', desc: challenge ? challenge.code : 'Challenge Stage' },
    { key: 'ALLOTTED', title: '4. Project Allotted', desc: project?.institution_name || 'Academic Allotment' },
    { key: 'PROGRESS', title: '5. Implementation', desc: project ? `${project.progress_percentage || 0}% Ground Progress` : 'Active Field Work' },
    { key: 'VERIFIED', title: '6. Verification', desc: 'Government Inspection' },
    { key: 'RESOLVED', title: '7. Resolved', desc: 'Civic Closure' }
  ];

  // Map backend status to active step index (0-6)
  const getActiveIndex = () => {
    const s = (status || '').toUpperCase();
    if (s === 'RESOLVED' || s === 'COMPLETED') return 6;
    if (s === 'VERIFIED') return 5;
    if (s === 'SUBMITTED_FOR_VERIFICATION' || s === 'IN_PROGRESS' || s === 'IN PROGRESS') return 4;
    if (s === 'ALLOTTED') return 3;
    if (s === 'UNIVERSITY ASSIGNED' || s === 'CHALLENGE CREATED') return 2;
    if (council || s === 'UNDER REVIEW' || s === 'UNDER_REVIEW') return 1;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h4>Civic Implementation Progress</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {council && (
            <span className="badge-council" title={council.department ? `Dept: ${council.department}` : ''}>
              <Building2 size={12} /> {council.name}
            </span>
          )}
          <span className="badge-project-status badge-status-inprogress" style={{ textTransform: 'uppercase' }}>
            {status}
          </span>
        </div>
      </div>

      <div className="timeline-steps-horizontal">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex;
          const isPending = idx > activeIndex;

          return (
            <div key={step.key} className="timeline-step-item">
              <div className={`timeline-step-node ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}`}>
                {isCompleted ? <Check size={14} /> : isActive ? <Clock size={14} /> : idx + 1}
              </div>
              <div className="timeline-step-title">{step.title}</div>
              <div className="timeline-step-desc">{step.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Progress percentage bar if project exists */}
      {project && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
            <span>Civic Implementation Progress</span>
            <span>{project.progress_percentage || 0}% Completed</span>
          </div>
          <div className="timeline-progress-bar-wrap">
            <div
              className="timeline-progress-bar-fill"
              style={{ width: `${Math.min(100, Math.max(0, project.progress_percentage || 0))}%` }}
            />
          </div>
        </div>
      )}

      {/* Public milestone updates */}
      {showUpdates && publicUpdates && publicUpdates.length > 0 && (
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
            Implementation Milestones &amp; Ground Updates
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
            {publicUpdates.map((u, i) => (
              <div key={i} style={{ padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>
                  <span>{u.update_title}</span>
                  <span style={{ color: '#075844' }}>{u.progress_percentage}%</span>
                </div>
                {u.description && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#4b5563', lineHeight: 1.3 }}>
                    {u.description}
                  </p>
                )}
                <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
