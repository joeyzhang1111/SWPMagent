import React from 'react';
import { MOCK } from '../data/mockData.js';
import BurndownChart from '../components/charts/BurndownChart.jsx';
import TaskPieChart from '../components/charts/TaskPieChart.jsx';

const stats = [
  { value: '12', label: 'Active Baselines', tone: 'blue', icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" /> },
  { value: '287', label: 'Total Tasks', tone: 'green', icon: <path d="M9 11l3 3 8-8" /> },
  { value: '5', label: 'Risk Items', tone: 'amber', icon: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
  { value: '3', label: 'Overdue', tone: 'red', icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></> },
];

const sources = [
  ['ALM', 'Tasks, Sprints, Defects', 'ok', 'Connected'],
  ['QC', 'Test Cases, QG Maturity', 'ok', 'Connected'],
  ['DOORS', 'Requirements, Traceability', 'ok', 'Connected'],
  ['Splunk', 'SWKPI Reports', 'warn', 'Syncing'],
];

export default function DashboardPage() {
  return (
    <section className="page active" id="page-dashboard">
      <div className="stat-cards">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className={`stat-icon stat-icon--${stat.tone}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{stat.icon}</svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card card--wide">
          <div className="card-header">
            <h3>Burndown Chart</h3>
            <select className="filter-select" defaultValue="ESP10 — BL3" aria-label="Burndown project">
              <option>ESP10 — BL3</option><option>IPB2.0 — BL2</option><option>ROPP41 — BL1</option>
            </select>
          </div>
          <div className="card-body"><BurndownChart /></div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Task Distribution</h3></div>
          <div className="card-body"><TaskPieChart /></div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Data Source Status</h3></div>
          <div className="card-body">
            <div className="source-status-list">
              {sources.map(([name, detail, status, label]) => (
                <div className="source-row" key={name}>
                  <span className="source-name">{name}</span>
                  <span className="source-detail">{detail}</span>
                  <span className={`status-badge status-badge--${status}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card card--wide">
          <div className="card-header"><h3>Upcoming Milestones</h3><span className="card-hint">Next 30 days</span></div>
          <div className="card-body">
            <div className="timeline">
              {MOCK.milestones.map((milestone) => (
                <div className={`timeline-item ${milestone.urgency}`} key={`${milestone.date}-${milestone.title}`}>
                  <span className="timeline-date">{milestone.date}</span>
                  <div className="timeline-content">
                    <div className="timeline-title">{milestone.title}</div>
                    <div className="timeline-desc">{milestone.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
