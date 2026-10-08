import React, { useMemo, useState } from 'react';
import { MOCK } from '../data/mockData.js';
import { useToast } from '../components/ToastProvider.jsx';

function statusTone(status) {
  if (status === 'Ongoing') return 'ok';
  if (status === 'Pending') return 'warn';
  return 'info';
}

export default function BaselinePage() {
  const showToast = useToast();
  const [filters, setFilters] = useState({ project: '', status: '', category: '' });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedFeatures, setSelectedFeatures] = useState(() => new Set(MOCK.features.filter((f) => f.checked).map((f) => f.id)));

  const baselines = useMemo(() => MOCK.baselines.filter((baseline) =>
    (!filters.project || baseline.project === filters.project)
    && (!filters.status || baseline.status === filters.status)
    && (!filters.category || baseline.category === filters.category)
  ), [filters]);

  const openWizard = () => {
    setWizardStep(1);
    setWizardOpen(true);
  };

  const nextStep = () => {
    if (wizardStep < 3) {
      setWizardStep((step) => step + 1);
      return;
    }
    setWizardOpen(false);
    showToast('Tasks generated successfully in ALM!');
  };

  const toggleFeature = (id) => {
    setSelectedFeatures((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <section className="page active" id="page-baseline">
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <select className="filter-select" value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })} aria-label="Baseline product">
            <option value="">All Products</option>
            {[...new Set(MOCK.baselines.map((b) => b.project))].map((project) => <option key={project}>{project}</option>)}
          </select>
          <select className="filter-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Baseline status">
            <option value="">All Status</option><option>Ongoing</option><option>Pending</option><option>Closed</option>
          </select>
          <select className="filter-select" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} aria-label="Baseline category">
            <option value="">All Categories</option><option>Core</option><option>Advanced</option><option>New</option>
          </select>
        </div>
        <button className="btn btn-primary" id="btn-create-baseline" onClick={openWizard}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Baseline
        </button>
      </div>

      <div className="baseline-table-wrap">
        <table className="data-table" id="baseline-table">
          <thead><tr><th>Project</th><th>Baseline</th><th>Category</th><th>Features</th><th>Sprint</th><th>Code Freeze</th><th>Param Freeze</th><th>Release Cat.</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {baselines.map((baseline) => (
              <tr key={`${baseline.project}-${baseline.baseline}`}>
                <td><strong>{baseline.project}</strong></td>
                <td><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{baseline.baseline}</span></td>
                <td>{baseline.category}</td><td>{baseline.features}</td>
                <td><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{baseline.sprint}</span></td>
                <td>{baseline.codeFreeze}</td><td>{baseline.paramFreeze}</td><td>{baseline.releaseCat}</td>
                <td><span className={`status-badge status-badge--${statusTone(baseline.status)}`}>{baseline.status}</span></td>
                <td><button className="action-btn action-btn--generate" onClick={openWizard}>Generate</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`modal-overlay${wizardOpen ? ' open' : ''}`} id="modal-beg-wizard" onMouseDown={(e) => { if (e.target === e.currentTarget) setWizardOpen(false); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-label="BEG Wizard">
          <div className="modal-header">
            <h2>BEG Wizard — Auto Generate Tasks</h2>
            <button className="modal-close" aria-label="Close wizard" onClick={() => setWizardOpen(false)}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="wizard-steps">
              {['Baseline Info', 'Feature Scope', 'Generate'].map((label, index) => {
                const step = index + 1;
                return <div className={`wizard-step${step === wizardStep ? ' active' : ''}${step < wizardStep ? ' done' : ''}`} key={label}><span className="step-num">{step}</span><span>{label}</span></div>;
              })}
            </div>
            <div className="wizard-content">
              <div className={`wizard-panel${wizardStep === 1 ? ' active' : ''}`}>
                <div className="form-grid">
                  <div className="form-group"><label>Project / Product</label><select className="form-input" defaultValue="ESP10"><option>ESP10</option><option>IPB2.0</option><option>ROPP41</option></select></div>
                  <div className="form-group"><label>Baseline Name</label><input type="text" className="form-input" placeholder="e.g. BL3.1" /></div>
                  <div className="form-group"><label>Category</label><select className="form-input" defaultValue="Core"><option>Core</option><option>Advanced</option><option>New</option></select></div>
                  <div className="form-group"><label>Release Category</label><select className="form-input" defaultValue="A-Sample"><option>A-Sample</option><option>B-Sample</option><option>C-Sample</option></select></div>
                  <div className="form-group"><label>Leading Time (weeks)</label><input type="number" className="form-input" defaultValue="12" /></div>
                  <div className="form-group"><label>Sprint Duration (weeks)</label><select className="form-input" defaultValue="2"><option>2</option><option>3</option><option>4</option></select></div>
                  <div className="form-group"><label>Code Freeze Date</label><input type="date" className="form-input" /></div>
                  <div className="form-group"><label>Parameter Freeze Date</label><input type="date" className="form-input" /></div>
                </div>
              </div>
              <div className={`wizard-panel${wizardStep === 2 ? ' active' : ''}`}>
                <p className="form-hint">Select features from DOORS requirements to include in this baseline:</p>
                <div className="feature-checklist">
                  {MOCK.features.map((feature) => (
                    <label className="feature-item" key={feature.id}>
                      <input type="checkbox" checked={selectedFeatures.has(feature.id)} onChange={() => toggleFeature(feature.id)} />
                      <span className="feature-item-label">{feature.name}</span><span className="feature-item-id">{feature.id}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={`wizard-panel${wizardStep === 3 ? ' active' : ''}`}>
                <div className="generate-preview">
                  <h4>Generation Preview</h4>
                  <div className="gen-summary">
                    <div className="gen-item"><span className="gen-count">3</span><span>EPICs</span></div>
                    <div className="gen-item"><span className="gen-count">12</span><span>Stories</span></div>
                    <div className="gen-item"><span className="gen-count">47</span><span>Tasks</span></div>
                  </div>
                  <p className="form-hint">{selectedFeatures.size} features selected. Tasks will be created in ALM and assigned to sprint plan automatically.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            {wizardStep > 1 && <button className="btn btn-secondary" onClick={() => setWizardStep((step) => step - 1)}>Back</button>}
            <button className="btn btn-primary" onClick={nextStep}>{wizardStep === 3 ? 'Generate in ALM' : 'Next'}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
