import React, { useEffect } from 'react';
import { reportUrl } from '../../API/analysis.js';
import { isJobRunning, useAnalysis } from '../../context/AnalysisContext.jsx';
import AnalysisResults from './AnalysisResults.jsx';
import MultiSelect from './MultiSelect.jsx';

function JobProgress({ job }) {
  if (!job) return null;
  return (
    <div className={`analysis-job analysis-job--${job.status}`}>
      <div className="analysis-job-heading"><strong>{job.message}</strong><span>{job.progress || 0}%</span></div>
      <div className="analysis-progress"><span style={{ width: `${job.progress || 0}%` }} /></div>
      {job.totalSteps > 0 && <div className="analysis-step-label">Step {job.step}/{job.totalSteps}</div>}
      {job.error && <div className="analysis-job-error">{job.error}</div>}
      {job.logs?.length > 0 && <details className="analysis-log" open={job.status === 'failed'}><summary>Run log ({job.logs.length})</summary><div>{job.logs.map((entry, index) => <p className={`log-${entry.level}`} key={`${entry.time}-${index}`}><span>{new Date(entry.time).toLocaleTimeString()}</span>{entry.message}</p>)}</div></details>}
    </div>
  );
}

function ResultScope({ request, stale }) {
  if (stale) {
    return <div className="analysis-result-scope analysis-result-scope--stale" role="status"><strong>This result is out of date.</strong> The project, build or selection changed after this run. Run full analysis to refresh it.</div>;
  }
  if (!request) return null;
  return <div className="analysis-result-scope">Result for <strong>{request.project}</strong> · build {request.build} · {request.almScopes?.length || 0} ALM iterations</div>;
}

export default function AnalysisWorkspace() {
  const {
    ready, init, projects, project, build, cachedBuilds, inputs, selection, inputLoading, error, jenkins, job,
    result, resultJobId, resultRequest, resultStale, expandingScope, scopeOptions, expandableScopes, canRun,
    changeProject, changeBuild, loadInputs, updateSelection, run, refreshJenkins, trigger, expandScope,
  } = useAnalysis();
  const running = isJobRunning(job);

  useEffect(() => { init(); }, [init]);

  if (!ready) return <div className="task-state">Loading reference analysis backend…</div>;

  return (
    <div className="analysis-workspace">
      <section className="analysis-control-card">
        <div className="analysis-control-heading">
          <div><span className="analysis-eyebrow">Reference analysis pipeline</span><h2>Jenkins · DOORS · ALM · QC</h2><p>Configure the same analysis scope used by the reference desktop tool, then run its five-step pipeline.</p></div>
          <div className="analysis-primary-actions">
            <button className="btn btn-secondary" type="button" onClick={loadInputs} disabled={!project || !build || inputLoading}>{inputLoading ? 'Loading inputs…' : 'Load inputs'}</button>
            <button className="btn btn-primary" type="button" onClick={run} disabled={!canRun}>{running ? 'Analysis running…' : 'Run full analysis'}</button>
            {result && resultJobId && <a className="btn btn-secondary" href={reportUrl(resultJobId)}>Export Excel</a>}
          </div>
        </div>
        <div className="analysis-source-row">
          <label><span>Jenkins project</span><select className="form-input" value={project} onChange={(event) => changeProject(event.target.value)}><option value="">Select project</option>{projects.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Build</span><input className="form-input" list="analysis-builds" value={build} onChange={(event) => changeBuild(event.target.value)} /><datalist id="analysis-builds">{cachedBuilds.map((item) => <option value={item} key={item} />)}</datalist></label>
          <div className="analysis-jenkins-actions"><button className="btn btn-secondary" type="button" onClick={refreshJenkins} disabled={!project}>Refresh Jenkins</button><button className="btn btn-secondary" type="button" onClick={trigger} disabled={!project || running}>Trigger build</button></div>
          {jenkins && <div className="analysis-jenkins-status"><strong>#{jenkins.last_build}</strong><span className={`status-badge status-badge--${jenkins.last_status === 'SUCCESS' ? 'ok' : 'warn'}`}>{jenkins.last_status}</span><small>Last success #{jenkins.last_success_build} · {jenkins.last_success_time}</small></div>}
        </div>
        {error && <div className="task-state task-state--error" role="alert">{error}</div>}
      </section>

      {inputs && <section className="analysis-input-grid">
        <MultiSelect label="10_AS modules" options={inputs.asFiles || []} value={selection.asFileNames} onChange={(values) => updateSelection('asFileNames', values)} />
        <MultiSelect label="10_AS baselines" options={inputs.asFeatures || []} value={selection.asFeatures} onChange={(values) => updateSelection('asFeatures', values)} />
        <MultiSelect label="40_Gen_SWXS modules" options={inputs.xsFiles || []} value={selection.xsFileNames} onChange={(values) => updateSelection('xsFileNames', values)} />
        <MultiSelect label="40_Gen_SWXS baselines" options={inputs.xsFeatures || []} value={selection.xsFeatures} onChange={(values) => updateSelection('xsFeatures', values)} />
        <MultiSelect label="ALM iterations" options={scopeOptions} value={selection.almScopes} onChange={(values) => updateSelection('almScopes', values)} expandable={expandableScopes} expanding={expandingScope} onExpand={expandScope} />
        <MultiSelect label="QC folders" options={inputs.qcPaths || []} value={selection.qcPaths} onChange={(values) => updateSelection('qcPaths', values)} />
      </section>}

      {!inputs && !inputLoading && <div className="task-state">Select a project and Build, then load its analysis inputs.</div>}
      <JobProgress job={job} />
      {result && <ResultScope request={resultRequest} stale={resultStale} />}
      {result && <AnalysisResults result={result} />}
    </div>
  );
}
