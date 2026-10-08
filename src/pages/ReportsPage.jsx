import React, { useMemo, useState } from 'react';
import { MOCK } from '../data/mockData.js';
import { useToast } from '../components/ToastProvider.jsx';

const summaries = [
  { title: 'ALM Summary', hint: 'Task & Sprint Status', metrics: [['47', 'Tasks Completed'], ['12', 'In Progress'], ['3', 'Blocked', 'warn'], ['2', 'Overdue', 'bad']] },
  { title: 'QC Summary', hint: 'Test Execution', metrics: [['156', 'Tests Passed'], ['8', 'Tests Failed', 'warn'], ['23', 'Not Run'], ['83%', 'Pass Rate']] },
  { title: 'DOORS Summary', hint: 'Requirement Coverage', metrics: [['324', 'Total Reqs'], ['298', 'Covered'], ['26', 'Uncovered', 'warn'], ['92%', 'Coverage']] },
];

export default function ReportsPage() {
  const showToast = useToast();
  const [week, setWeek] = useState('Week 35 (Aug 25 – Aug 31)');
  const [project, setProject] = useState('');
  const risks = useMemo(() => MOCK.risks.filter((risk) => !project || risk.project === project), [project]);

  return (
    <section className="page active" id="page-reports">
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <select className="filter-select" value={week} onChange={(e) => setWeek(e.target.value)} aria-label="Report week"><option>Week 35 (Aug 25 – Aug 31)</option><option>Week 34 (Aug 18 – Aug 24)</option><option>Week 33 (Aug 11 – Aug 17)</option></select>
          <select className="filter-select" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Report project"><option value="">All Projects</option><option>ESP10</option><option>IPB2.0</option><option>ROPP41</option></select>
        </div>
        <button className="btn btn-primary" id="btn-generate-report" onClick={() => showToast(`Weekly report generated for ${week} and sent to SWPCM!`)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          Generate Report
        </button>
      </div>

      <div className="report-grid">
        {summaries.map((summary) => (
          <div className="card" key={summary.title}>
            <div className="card-header"><h3>{summary.title}</h3><span className="card-hint">{summary.hint}</span></div>
            <div className="card-body"><div className="report-metrics">
              {summary.metrics.map(([value, label, tone]) => <div className="report-metric" key={label}><span className={`rm-value${tone ? ` rm-${tone}` : ''}`}>{value}</span><span className="rm-label">{label}</span></div>)}
            </div></div>
          </div>
        ))}
        <div className="card card--wide">
          <div className="card-header"><h3>Risk Prediction</h3><span className="card-hint">Based on burndown & historical data</span></div>
          <div className="card-body"><div className="risk-list">
            {risks.map((risk) => (
              <div className={`risk-item risk-${risk.level}`} key={risk.title}>
                <span className="risk-level">{risk.level}</span>
                <div className="risk-content"><div className="risk-title">{risk.title}</div><div className="risk-desc">{risk.desc}</div></div>
                <span className="risk-project">{risk.project}</span>
              </div>
            ))}
          </div></div>
        </div>
      </div>
    </section>
  );
}
