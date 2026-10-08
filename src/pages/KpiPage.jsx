import React, { useState } from 'react';
import KpiTrendChart from '../components/charts/KpiTrendChart.jsx';
import { useToast } from '../components/ToastProvider.jsx';

const categories = [
  {
    title: 'Requirement Management', source: 'DOORS',
    items: [{ name: 'Requirement Mgmt Checklist', desc: 'Refer to DoD result', target: 'Target: ≤20%', actual: '12%', tone: 'ok', width: 60 }],
  },
  {
    title: 'SW Implementation', source: 'ALM',
    items: [
      { name: 'Effort Control (Actual vs Planned)', desc: 'Monthly deviation check', target: 'Target: |abs| ≤5%', actual: '+3.2%', tone: 'ok', width: 64 },
      { name: 'LL Sharing per BL', desc: 'LL/BP count in T&R per baseline', target: 'Target: ≥3', actual: '4', tone: 'ok', width: 80 },
    ],
  },
  {
    title: 'Test & Delivery', source: 'QC + DOORS',
    items: [
      { name: 'DOORS vs QC Coverage', desc: 'All accepted req IDs available in QC', target: 'Target: 100%', actual: '94%', tone: 'warn', width: 94 },
      { name: 'Open Topics before QG', desc: 'Open items in ALM, QC, DOORS before EV', target: 'Target: 0', actual: '2', tone: 'bad', width: 40 },
      { name: 'Additional SW Release (Defects)', desc: 'Extra releases due to defects', target: 'Target: 0', actual: '0', tone: 'ok', width: 100 },
    ],
  },
  {
    title: 'Technical Compliance', source: 'Splunk',
    items: [{ name: 'Technical Compliance', desc: 'Leakage in TC check for state-of-art dev', target: 'Target: 0 issues', actual: '0', tone: 'ok', width: 100 }],
  },
];

export default function KpiPage() {
  const showToast = useToast();
  const [release, setRelease] = useState('ESP10 — BL3');

  return (
    <section className="page active" id="page-kpi">
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <select className="filter-select" value={release} onChange={(e) => setRelease(e.target.value)} aria-label="KPI release">
            <option>ESP10 — BL3</option><option>IPB2.0 — BL2</option><option>ROPP41 — BL1</option>
          </select>
        </div>
        <button className="btn btn-secondary" id="btn-export-kpi" onClick={() => showToast(`SWKPI report for ${release} exported successfully!`)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Export Report
        </button>
      </div>

      <div className="kpi-grid">
        {categories.map((category) => (
          <div className="kpi-category-card" key={category.title}>
            <div className="kpi-cat-header"><h3>{category.title}</h3><span className="kpi-source-tag">{category.source}</span></div>
            <div className="kpi-items">
              {category.items.map((item) => (
                <div className="kpi-row" key={item.name}>
                  <div className="kpi-info"><span className="kpi-name">{item.name}</span><span className="kpi-desc">{item.desc}</span></div>
                  <div className="kpi-metric"><span className="kpi-target">{item.target}</span><span className={`kpi-actual kpi-${item.tone}`}>{item.actual}</span></div>
                  <div className="kpi-bar"><div className={`kpi-bar-fill kpi-bar--${item.tone}`} style={{ width: `${item.width}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card card--wide kpi-trend-card">
        <div className="card-header"><h3>KPI Trend — Last 6 Releases</h3></div>
        <div className="card-body"><KpiTrendChart /></div>
      </div>
    </section>
  );
}
