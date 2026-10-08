import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTasks } from '../API/tasks.js';

const STATUSES = [
  ['To Do', 'todo'],
  ['In Progress', 'progress'],
  ['In Review', 'review'],
  ['Done', 'done'],
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function ratioTone(done, total) {
  if (total === 0) return 'info';
  if (done === total) return 'ok';
  if (done === 0) return 'bad';
  return 'warn';
}

function classToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function formatFetchedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function Arrow() {
  return <svg className="pipe-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function ViewIcon({ type }) {
  if (type === 'table') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
  if (type === 'board') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="12" r="2.5" /><path d="M8.2 7.2L15.8 10.8M8.2 16.8L15.8 13.2" /></svg>;
}

function TaskSummary({ tasks, meta }) {
  const almCount = tasks.filter((task) => task.source === 'ALM').length;
  const doorsCount = tasks.filter((task) => task.source === 'DOORS').length;
  const qcCount = tasks.filter((task) => task.source === 'QC').length;
  const openCount = tasks.filter((task) => task.status !== 'Done').length;
  const issueCount = tasks.filter((task) => task.issueReason).length;
  const cards = [
    ['Visible', tasks.length, 'neutral'],
    ['ALM', almCount, 'alm'],
    ['DOORS', doorsCount, 'doors'],
    ['QC', qcCount, 'qc'],
    ['Open', openCount, 'open'],
    ['Quality issues', issueCount, 'issue'],
  ];

  return (
    <div className="task-summary-grid">
      {cards.map(([label, value, tone]) => (
        <div className={`task-summary-card task-summary-card--${tone}`} key={label}>
          <span>{label}</span>
          <strong>{value.toLocaleString()}</strong>
        </div>
      ))}
      {Object.entries(meta.sourceErrors || {}).map(([source, message]) => (
        <div className="task-source-warning" title={message} key={source}>{source} source unavailable</div>
      ))}
    </div>
  );
}

function TaskViewFilters({ filters, setFilters, filterOptions }) {
  return (
    <div className="task-view-filters">
      <select className="filter-select" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} aria-label="Task type">
        <option value="">All Types</option>
        {filterOptions.types.map((type) => <option key={type}>{type}</option>)}
      </select>
      <select className="filter-select" value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} aria-label="Task source">
        <option value="">All Sources</option>
        {filterOptions.sources.map((source) => <option key={source}>{source}</option>)}
      </select>
      <select className="filter-select" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} aria-label="Task status">
        <option value="">All Statuses</option>
        {STATUSES.map(([status]) => <option key={status}>{status}</option>)}
      </select>
    </div>
  );
}

function TaskTable({ tasks, filters, setFilters, filterOptions }) {
  return (
    <>
      <TaskViewFilters filters={filters} setFilters={setFilters} filterOptions={filterOptions} />
      {tasks.length === 0 ? <div className="task-state">No work items match the selected task filters.</div> : <div className="task-table-wrap">
        <table className="data-table" id="task-table">
          <thead><tr><th>ID</th><th>Source</th><th>Type</th><th>Title</th><th>Project / Iteration</th><th>Owner</th><th>Due</th><th>Status</th><th>Raw Status</th></tr></thead>
          <tbody>
            {tasks.map((task) => {
              const statusTone = task.status === 'Done' ? 'ok' : task.status === 'In Progress' ? 'info' : task.status === 'In Review' ? 'warn' : 'info';
              return (
                <tr key={task.key || task.id}>
                  <td><span className="task-id">{task.id}</span></td>
                  <td><span className={`source-tag source-tag--${classToken(task.source)}`}>{task.source}</span></td>
                  <td><span className={`type-badge type-${classToken(task.type)}`}>{task.type}</span></td>
                  <td><div className="task-title-cell" title={task.title}><strong>{task.title}</strong>{task.module && <span>{task.module}</span>}</div></td>
                  <td><div className="task-scope-cell"><strong>{task.project || '—'}</strong><span>{task.iteration || '—'}{task.component ? ` · ${task.component}` : ''}</span></div></td>
                  <td>{task.assignee}</td>
                  <td><span className="task-date">{task.due || '—'}</span></td>
                  <td><span className={`status-badge status-badge--${statusTone}`}>{task.status}</span></td>
                  <td>{task.rawState || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>}
    </>
  );
}

function KanbanBoard({ tasks, filters, setFilters, filterOptions }) {
  return (
    <>
      <TaskViewFilters filters={filters} setFilters={setFilters} filterOptions={filterOptions} />
      {tasks.length === 0 ? <div className="task-state">No work items match the selected task filters.</div> : <div className="kanban-board">
        {STATUSES.map(([status, tone]) => {
          const columnTasks = tasks.filter((task) => task.status === status);
          return (
            <div className="kanban-col" key={status}>
              <div className="kanban-col-header"><span className={`kanban-dot kanban-dot--${tone}`} />{status}<span className="kanban-count">{columnTasks.length}</span></div>
              <div className="kanban-cards">
                {columnTasks.map((task) => {
                  const initials = String(task.assignee || 'Unassigned').split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 3);
                  const dueDate = task.due ? new Date(`${task.due}T23:59:59`) : null;
                  const overdue = dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < new Date() && task.status !== 'Done';
                  return (
                    <div className="kanban-card" key={task.key || task.id}>
                      <div className="kanban-card-title">{task.title}</div>
                      {task.issueReason && <div className="kanban-card-issue" title={task.issueReason}>{task.issueReason}</div>}
                      <div className="kanban-card-meta">
                        <span className={`type-badge type-${classToken(task.type)}`}>{task.type}</span>
                        <span className={`source-tag source-tag--${classToken(task.source)}`}>{task.source}</span>
                        <span className={`kanban-card-due${overdue ? ' overdue' : ''}`}>{task.due || 'No due date'}</span>
                        <span className="kanban-card-assignee">{initials}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>}
    </>
  );
}

function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="task-pagination">
      <span>{start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}</span>
      <label>Rows <select className="filter-select" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      <button className="btn btn-secondary" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>Page {page} / {pageCount}</span>
      <button className="btn btn-secondary" type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  );
}

function TraceNode({ node }) {
  const tone = node.status === 'Done' ? 'ok' : node.status === 'In Review' ? 'warn' : 'info';
  return (
    <div className="pipe-node">
      <div className="pipe-node-tags"><span className={`source-tag source-tag--${classToken(node.source)}`}>{node.source}</span><span className={`type-badge type-${classToken(node.type)}`}>{node.type}</span></div>
      <span className="pipe-node-id">{node.id}</span>
      <span className="pipe-node-title">{node.title}</span>
      {node.via && <span className="pipe-node-ref">Exact link: {node.via}</span>}
      {node.status && <span className={`status-badge status-badge--${tone}`}>{node.status}</span>}
    </div>
  );
}

function TraceDetail({ trace }) {
  const qcNodes = [...trace.qcRequirements, ...trace.qcTests];
  return (
    <div className="pipeline-row">
      <div className="trace-lane"><span className="trace-lane-label">DOORS</span><div className="lane-zone lane-zone--doors"><TraceNode node={trace.requirement} /></div></div>
      <Arrow />
      <div className="trace-lane"><span className="trace-lane-label">ALM</span><div className="lane-zone lane-zone--alm">
        {trace.alm.map((node) => <TraceNode node={node} key={node.key || node.id} />)}
        {trace.unresolvedAlmIds.map((id) => <div className="pipe-node pipe-node--unresolved" key={id}><span className="source-tag source-tag--alm">ALM</span><span className="pipe-node-id">{id}</span><span className="pipe-node-title">Outside loaded ALM scopes</span><span className="pipe-node-ref">Exact ID exists in DOORS external export</span></div>)}
        {trace.alm.length === 0 && trace.unresolvedAlmIds.length === 0 && <span className="trace-empty">No ALM link</span>}
      </div></div>
      <Arrow />
      <div className="trace-lane"><span className="trace-lane-label">QC</span><div className="lane-zone lane-zone--qc">
        {qcNodes.map((node) => <TraceNode node={node} key={node.key || node.id} />)}
        {qcNodes.length === 0 && <span className="trace-empty">No QC link</span>}
      </div></div>
    </div>
  );
}

function TraceabilityMatrix({ traceability, meta, categoryFilter, onCategoryFilterChange }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const endToEndRate = meta.linkedDoorCount ? Math.round((meta.endToEndCount / meta.linkedDoorCount) * 100) : 0;

  const toggle = (id) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <>
      <div className="trace-health-bar">
        <div className="health-chip"><span className="health-dot health-dot--ok" />End-to-end {meta.endToEndCount || 0}</div>
        <div className="health-chip"><span className="health-dot health-dot--warn" />DOORS→ALM only {meta.doorsAlmOnlyCount || 0}</div>
        <div className="health-chip"><span className="health-dot health-dot--warn" />DOORS→QC only {meta.doorsQcOnlyCount || 0}</div>
        <div className="health-chip" title={`${meta.unresolvedAlmReferences || 0} unresolved ALM reference edges`}><span className="health-dot health-dot--bad" />Unresolved ALM only {meta.unresolvedOnlyCount || 0}</div>
        <label className="trace-category-filter">
          <span>Trace category</span>
          <select className="filter-select" value={categoryFilter} onChange={(event) => onCategoryFilterChange(event.target.value)}>
            <option value="">All trace links ({meta.linkedDoorCount || 0})</option>
            <option value="end-to-end">End-to-end ({meta.endToEndCount || 0})</option>
            <option value="doors-alm">DOORS→ALM only ({meta.doorsAlmOnlyCount || 0})</option>
            <option value="doors-qc">DOORS→QC only ({meta.doorsQcOnlyCount || 0})</option>
            <option value="unresolved-alm">Unresolved ALM only ({meta.unresolvedOnlyCount || 0})</option>
          </select>
        </label>
        <div className="health-progress"><span className="health-progress-label">End-to-end coverage</span><div className="health-progress-bar"><div className="health-progress-fill" style={{ width: `${endToEndRate}%` }} /></div><span className="health-progress-pct">{endToEndRate}%</span></div>
      </div>
      {traceability.length === 0 ? <div className="task-state">No traceability records match the selected category and task filters.</div> : <div className="trace-matrix-wrap">
        <table className="matrix-table">
          <thead><tr><th className="th-doors">DOORS Requirement</th><th className="th-alm">ALM Work Items</th><th className="th-qc">QC Requirements</th><th className="th-qc">QC Test Instances</th><th>Link State</th><th>Quality</th></tr></thead>
          <tbody>
            {traceability.map((trace) => {
              const passedTests = trace.qcTests.filter((node) => node.status === 'Done').length;
              const qualityIssues = [...trace.qcRequirements, ...trace.qcTests].filter((node) => node.issueReason).length;
              const isExpanded = expanded.has(trace.id);
              return (
                <React.Fragment key={trace.id}>
                  <tr className="matrix-row--expandable" onClick={() => toggle(trace.id)} aria-expanded={isExpanded}>
                    <td><strong>{trace.requirement.id}</strong><br /><span className="req-sub">{trace.requirement.title}</span><br /><span className="req-sub">{trace.requirement.project} · {trace.requirement.iteration}</span></td>
                    <td>{trace.alm.length ? <><strong>{trace.alm.length}</strong> loaded</> : <span className="req-sub">0 loaded</span>}{trace.unresolvedAlmIds.length > 0 && <><br /><span className="task-issue">{trace.unresolvedAlmIds.length} outside scope</span></>}</td>
                    <td>{trace.qcRequirements.length.toLocaleString()}</td>
                    <td><span className={`status-badge status-badge--${ratioTone(passedTests, trace.qcTests.length)}`}>{passedTests}/{trace.qcTests.length} Passed</span></td>
                    <td><span className={`health-tag health-tag--${trace.health.level}`} title={trace.health.reason}><span className={`health-dot health-dot--${trace.health.level}`} />{trace.health.label}</span></td>
                    <td>{qualityIssues ? <span className="task-issue">{qualityIssues} issue{qualityIssues === 1 ? '' : 's'}</span> : <span className="status-badge status-badge--ok">Clear</span>}</td>
                  </tr>
                  {isExpanded && <tr className="matrix-detail-row"><td colSpan="6"><div className="expand-detail"><TraceDetail trace={trace} /></div></td></tr>}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>}
    </>
  );
}

export default function TasksPage() {
  const [view, setView] = useState('table');
  const [filters, setFilters] = useState({ query: '', project: '', iteration: '', type: '', source: '', status: '' });
  const [data, setData] = useState({ tasks: [], traceability: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [traceCategory, setTraceCategory] = useState('');

  const loadTasks = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const nextData = await fetchTasks({ refresh });
      setData(nextData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchTasks({ signal: controller.signal })
      .then(setData)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load tasks');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const tasks = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const applyTaskViewFilters = view !== 'trace';
    return data.tasks.filter((task) =>
      (!query || [task.id, task.title, task.module, task.component, task.assignee, task.issueReason].some((value) => String(value || '').toLowerCase().includes(query)))
      && (!filters.project || task.project === filters.project)
      && (!filters.iteration || task.iteration === filters.iteration)
      && (!applyTaskViewFilters || !filters.type || task.type === filters.type)
      && (!applyTaskViewFilters || !filters.source || task.source === filters.source)
      && (!applyTaskViewFilters || !filters.status || task.status === filters.status)
    );
  }, [data.tasks, filters, view]);

  const filterOptions = useMemo(() => ({
    projects: [...new Set(data.tasks.map((task) => task.project).filter(Boolean))].sort(),
    iterations: [...new Set(data.tasks
      .filter((task) => !filters.project || task.project === filters.project)
      .map((task) => task.iteration)
      .filter(Boolean))].sort(),
    types: [...new Set(data.tasks.map((task) => task.type).filter(Boolean))].sort(),
    sources: [...new Set(data.tasks.map((task) => task.source).filter(Boolean))].sort(),
  }), [data.tasks, filters.project]);

  const scopedTraceability = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return data.traceability.filter((trace) => {
      const nodes = [trace.requirement, ...trace.alm, ...trace.qcRequirements, ...trace.qcTests];
      return (!query || nodes.some((node) => [node.id, node.title, node.project, node.iteration].some((value) => String(value || '').toLowerCase().includes(query))))
        && (!filters.project || trace.requirement.project === filters.project)
        && (!filters.iteration || nodes.some((node) => node.iteration === filters.iteration));
    });
  }, [data.traceability, filters]);

  const traceabilityMeta = useMemo(() => ({
    ...(data.meta.traceability || {}),
    linkedDoorCount: scopedTraceability.length,
    doorsWithAlm: scopedTraceability.filter((trace) => trace.alm.length > 0).length,
    doorsWithQc: scopedTraceability.filter((trace) => trace.qcRequirements.length > 0 || trace.qcTests.length > 0).length,
    endToEndCount: scopedTraceability.filter((trace) => trace.category === 'end-to-end').length,
    doorsAlmOnlyCount: scopedTraceability.filter((trace) => trace.category === 'doors-alm').length,
    doorsQcOnlyCount: scopedTraceability.filter((trace) => trace.category === 'doors-qc').length,
    unresolvedOnlyCount: scopedTraceability.filter((trace) => trace.category === 'unresolved-alm').length,
    unresolvedAlmReferences: scopedTraceability.reduce((total, trace) => total + trace.unresolvedAlmIds.length, 0),
  }), [data.meta.traceability, scopedTraceability]);

  const traceability = useMemo(
    () => scopedTraceability.filter((trace) => !traceCategory || trace.category === traceCategory),
    [scopedTraceability, traceCategory],
  );

  const fetchedAt = formatFetchedAt(data.meta.fetchedAt);
  const currentTotal = view === 'trace' ? traceability.length : tasks.length;
  const pageCount = Math.max(1, Math.ceil(currentTotal / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedTasks = useMemo(() => tasks.slice((safePage - 1) * pageSize, safePage * pageSize), [tasks, safePage, pageSize]);
  const pagedTraceability = useMemo(() => traceability.slice((safePage - 1) * pageSize, safePage * pageSize), [traceability, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize, view, traceCategory]);

  return (
    <section className="page active" id="page-tasks">
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <input className="task-search" type="search" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Search ID, title, module, component, owner…" aria-label="Search tasks" />
          <select className="filter-select" value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value, iteration: '' })} aria-label="Task project"><option value="">All Projects</option>{filterOptions.projects.map((project) => <option key={project}>{project}</option>)}</select>
          <select className="filter-select" value={filters.iteration} onChange={(e) => setFilters({ ...filters, iteration: e.target.value })} aria-label="Task iteration"><option value="">All Iterations</option>{filterOptions.iterations.map((iteration) => <option key={iteration}>{iteration}</option>)}</select>
          <div className="view-toggle">
            {['table', 'board', 'trace'].map((item) => <button className={`view-btn${view === item ? ' active' : ''}`} key={item} onClick={() => setView(item)} title={item === 'trace' ? 'Traceability' : `${item} view`} aria-label={`${item} view`}><ViewIcon type={item} /></button>)}
          </div>
        </div>
        <div className="task-sync">
          {fetchedAt && <span className="task-sync-meta">{data.meta.source || 'Backend'} · {data.meta.count ?? data.tasks.length} items · {fetchedAt}</span>}
          <button className="btn btn-secondary task-refresh" type="button" onClick={() => loadTasks(true)} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
      </div>
      {error && <div className="task-state task-state--error" role="alert"><strong>Task data unavailable</strong><span>{error}</span><button className="btn btn-secondary" type="button" onClick={() => loadTasks(true)}>Try again</button></div>}
      {!error && loading && data.tasks.length === 0 && <div className="task-state" role="status">Loading tasks from the backend…</div>}
      {!error && !loading && data.tasks.length === 0 && <div className="task-state">The backend returned no work items for the configured iteration.</div>}
      {!error && data.tasks.length > 0 && <>
        <TaskSummary tasks={tasks} meta={data.meta} />
        {view === 'table' && <div className="task-view active"><TaskTable tasks={pagedTasks} filters={filters} setFilters={setFilters} filterOptions={filterOptions} /></div>}
        {view === 'board' && <div className="task-view active"><KanbanBoard tasks={pagedTasks} filters={filters} setFilters={setFilters} filterOptions={filterOptions} /></div>}
        {view === 'trace' && <div className="task-view active">{data.traceability.length > 0 ? <TraceabilityMatrix traceability={pagedTraceability} meta={traceabilityMeta} categoryFilter={traceCategory} onCategoryFilterChange={setTraceCategory} /> : <div className="task-state">No exact exported cross-source links are available.</div>}</div>}
        {currentTotal > 0 && <Pagination page={safePage} pageSize={pageSize} total={currentTotal} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      </>}
    </section>
  );
}
