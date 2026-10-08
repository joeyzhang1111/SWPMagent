import React from 'react';
import { Link } from 'react-router-dom';

const taskItems = [
  {
    title: 'New specification detected',
    description: 'SPEC-2481 was added to ESP10. A T&R task was created and Emma Wilson was notified by email.',
    meta: '2 minutes ago',
    badge: 'Action created',
    tone: 'success',
  },
  {
    title: 'Change request synchronized',
    description: 'CR-107 was linked to its ALM work items and added to the current delivery baseline.',
    meta: '18 minutes ago',
    badge: 'Synchronized',
    tone: 'info',
  },
];

const timingItems = [
  {
    title: 'Schedule risk detected',
    description: 'REQ-2048 is not expected to finish by September 18. Owner Daniel Kim has been notified.',
    meta: 'Due in 2 days',
    badge: 'At risk',
    tone: 'warning',
  },
];

const qualityItems = [
  {
    title: 'Rsik Detected',
    description: 'The Software SPEC-2416 is not linked. Owner Daniel Kim has been notified.',
    badge: 'At Risk',
    tone: 'risk',
  },
];

const icons = {
  tasks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" />
    </svg>
  ),
  timing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  quality: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v5c0 4.6-2.8 8.1-7 10-4.2-1.9-7-5.4-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
};

function MonitorPanel({ type, eyebrow, title, description, items }) {
  return (
    <article className={`monitor-panel monitor-panel--${type}`}>
      <header className="monitor-panel-header">
        <div className={`monitor-icon monitor-icon--${type}`}>{icons[type]}</div>
        <div>
          <span className="monitor-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="monitor-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </header>

      <div className="monitor-items">
        {items.map((item) => (
          <div className="monitor-item" key={item.title}>
            <span className={`monitor-status-dot monitor-status-dot--${item.tone}`} aria-hidden="true" />
            <div className="monitor-item-copy">
              <div className="monitor-item-title-row">
                <h3>{item.title}</h3>
                <span className={`monitor-badge monitor-badge--${item.tone}`}>{item.badge}</span>
              </div>
              <p>{item.description}</p>
              <div className="monitor-item-footer">
                <span>{item.meta}</span>
                {item.link && (
                  <Link className="monitor-link" to="/tasks">
                    {item.link}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function AgentMonitorPage() {
  return (
    <section className="page active agent-monitor-page" id="page-agent-monitor">
      <div className="agent-monitor-summary">
        <div>
          <span className="agent-live-indicator"><span /> Agent online</span>
          <p>Automated project monitoring is running across connected data sources.</p>
        </div>
        <div className="agent-summary-stat">
          <strong>4</strong>
          <span>active checks</span>
        </div>
      </div>

      <div className="agent-monitor-grid">
        <MonitorPanel
          type="tasks"
          eyebrow="Agent activity"
          title="Agent Task List"
          description="Tasks created or completed automatically by the project agent."
          items={taskItems}
        />
        <MonitorPanel
          type="timing"
          eyebrow="Delivery watch"
          title="Timing Monitor"
          description="Schedule exceptions and due-date risks that need attention."
          items={timingItems}
        />
        <MonitorPanel
          type="quality"
          eyebrow="Continuous assurance"
          title="Quality Monitor"
          description="Automated checks on completed requirements and specifications."
          items={qualityItems}
        />
      </div>
    </section>
  );
}
