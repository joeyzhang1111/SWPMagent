import React, { useEffect, useMemo, useState } from 'react';

const TABS = [
  ['overview', 'Overview'],
  ['asRows', '10_AS'],
  ['xsRows', '40_Gen_SWXS'],
  ['almRows', 'ALM'],
  ['qcTestInstances', 'QC TestInstance'],
  ['qcRequirements', 'QC Requirement'],
];

const COLUMNS = {
  asRows: ['File_name', 'Object_Identifier', 'Object_Text', 'RB_Baseline', 'RB_AS_Status', 'RB_Change_Required', 'RB_Top_FNID', 'Corresponding ALM', 'Corresponding SWXS', 'Issue Reason'],
  xsRows: ['File_name', 'Object_Text', 'RB_Baseline', 'RB_RS_CP_Status', 'RB_TestStatus', 'RB_ReviewStatus', 'Story Description', 'Issue Reason'],
  almRows: ['ID', 'Type', 'Title', 'State', 'Resolution', 'Severity', 'Planned For', 'Filed Against', 'Owned By', 'Approvals', 'Issue Reason'],
  qcTestInstances: ['TestSetFolder_Path_full', 'TestSet_Name', 'TestExec_Status', 'Test_Name', 'ResponsibleTester', 'RB_Comment'],
  qcRequirements: ['REQ_ID', 'RB_Baseline', 'Direct_Cover_Status', 'ReqFolder_Path', 'Name', 'Author', 'Requirement_Type'],
};

const PAGE_SIZE = 50;

function issueText(row, tab, result) {
  if (tab === 'qcTestInstances') {
    const status = String(row.TestExec_Status || '').trim();
    return status !== 'Passed' && !String(row.RB_Comment || '').trim() ? 'Non-Passed without RB_Comment' : '';
  }
  if (tab === 'qcRequirements') return String(row.Direct_Cover_Status || '') !== 'Passed' ? 'Coverage is not Passed' : '';
  if (tab === 'almRows') {
    const match = (result.almIssues || []).find((item) => String(item.ID) === String(row.ID));
    return String(match?.['Issue Reason'] || row['Issue Reason'] || '');
  }
  return String(row['Issue Reason'] || '');
}

function Overview({ result }) {
  const cards = [
    ['10_AS', result.asRows?.length || 0, result.asRows?.filter((row) => row['Issue Reason']).length || 0],
    ['40_Gen_SWXS', result.xsRows?.length || 0, result.xsRows?.filter((row) => row['Issue Reason']).length || 0],
    ['ALM', result.almRows?.length || 0, result.almIssues?.length || 0],
    ['QC TestInstance', result.qcTestInstances?.length || 0, result.qcProblems?.length || 0],
    ['QC Requirement', result.qcRequirements?.length || 0, result.qcRequirements?.filter((row) => row.Direct_Cover_Status !== 'Passed').length || 0],
  ];
  return (
    <div className="analysis-overview">
      <div className="analysis-overview-cards">
        {cards.map(([label, total, issues]) => <div className="analysis-overview-card" key={label}><span>{label}</span><strong>{total.toLocaleString()}</strong><small>{issues.toLocaleString()} issues</small></div>)}
      </div>
      <div className="analysis-summary-grid">
        <pre>{(result.summaries?.as || []).join('\n')}</pre>
        <pre>{(result.summaries?.xs || []).join('\n')}</pre>
        <pre>{result.summaries?.alm || 'No ALM summary'}</pre>
      </div>
    </div>
  );
}

export default function AnalysisResults({ result }) {
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const rows = result?.[tab] || [];
  const columns = COLUMNS[tab] || [];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const issue = issueText(row, tab, result);
      return (!issuesOnly || issue) && (!normalized || Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
    });
  }, [issuesOnly, query, result, rows, tab]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => setPage(1), [tab, query, issuesOnly]);

  return (
    <div className="analysis-results">
      <div className="analysis-result-tabs">
        {TABS.map(([key, label]) => <button type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)} key={key}>{label}{key !== 'overview' && <span>{(result?.[key] || []).length}</span>}</button>)}
      </div>
      {tab === 'overview' ? <Overview result={result} /> : <>
        <div className="analysis-result-filters">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search current result…" />
          <label><input type="checkbox" checked={issuesOnly} onChange={(event) => setIssuesOnly(event.target.checked)} /> Issues only</label>
          <span>{filtered.length.toLocaleString()} rows</span>
        </div>
        {visible.length === 0 ? <div className="task-state">No rows match the current filters.</div> : <div className="analysis-table-wrap">
          <table className="data-table analysis-table">
            <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>{visible.map((row, index) => {
              const issue = issueText(row, tab, result);
              return <tr className={issue ? 'analysis-row--issue' : ''} key={`${safePage}-${index}-${row.ID || row.Object_Identifier || row.REQ_ID || ''}`}>{columns.map((column) => <td title={String(row[column] ?? '')} key={column}>{column === 'Issue Reason' ? (issue || '—') : String(row[column] ?? '') || '—'}</td>)}</tr>;
            })}</tbody>
          </table>
        </div>}
        <div className="task-pagination">
          <span>{filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <button className="btn btn-secondary" type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button>
          <span>Page {safePage} / {pageCount}</span>
          <button className="btn btn-secondary" type="button" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Next</button>
        </div>
      </>}
    </div>
  );
}
