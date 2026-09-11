// SWPM Application Logic
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  renderBaselines();
  renderTasks();
  renderTraceability();
  renderMilestones();
  renderRisks();
  renderNotifications();
  renderFeatureChecklist();
  initWizard();
  initViewToggle();
  initCharts();
});

// Navigation
function initNavigation() {
  const items = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');

  const pageMeta = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of all project activities' },
    baseline: { title: 'Baseline Management', subtitle: 'Configure baselines and auto-generate tasks via BEG Wizard' },
    tasks: { title: 'Task Tracking', subtitle: 'ALM / QC / DOORS task status with priority and maturity' },
    kpi: { title: 'SWKPI Dashboard', subtitle: 'Key performance indicators per release' },
    reports: { title: 'Weekly Report', subtitle: 'Auto-generated ALM-QC-DOORS consolidated report' },
    notifications: { title: 'Notifications', subtitle: 'Due-date reminders and automated alerts' },
  };

  items.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      pages.forEach(p => p.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.add('active');
      const meta = pageMeta[page] || {};
      titleEl.textContent = meta.title || '';
      subtitleEl.textContent = meta.subtitle || '';
    });
  });
}

// Baseline table
function renderBaselines() {
  const tbody = document.getElementById('baseline-tbody');
  if (!tbody) return;
  tbody.innerHTML = MOCK.baselines.map(b => {
    const statusClass = b.status === 'Ongoing' ? 'ok' : b.status === 'Pending' ? 'warn' : 'info';
    return `<tr>
      <td><strong>${b.project}</strong></td>
      <td><span style="font-family:'JetBrains Mono',monospace">${b.baseline}</span></td>
      <td>${b.category}</td>
      <td>${b.features}</td>
      <td><span style="font-family:'JetBrains Mono',monospace">${b.sprint}</span></td>
      <td>${b.codeFreeze}</td>
      <td>${b.paramFreeze}</td>
      <td>${b.releaseCat}</td>
      <td><span class="status-badge status-badge--${statusClass}">${b.status}</span></td>
      <td>
        <button class="action-btn action-btn--generate" onclick="openBEGWizard()">Generate</button>
      </td>
    </tr>`;
  }).join('');
}

// Task table and kanban
function renderTasks() {
  const tbody = document.getElementById('task-tbody');
  if (tbody) {
    tbody.innerHTML = MOCK.tasks.map(t => {
      const srcClass = t.source.toLowerCase();
      const typeClass = t.type.toLowerCase();
      const prClass = t.priority.toLowerCase();
      const matClass = t.maturity >= 80 ? 'ok' : t.maturity >= 40 ? 'warn' : 'bad';
      const statusClass = t.status === 'Done' ? 'ok' : t.status === 'In Progress' ? 'info' : t.status === 'In Review' ? 'warn' : '';
      return `<tr>
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:0.8rem">${t.id}</span></td>
        <td><span class="type-badge type-${typeClass}">${t.type}</span></td>
        <td>${t.title}</td>
        <td><span class="source-tag source-tag--${srcClass}">${t.source}</span></td>
        <td>${t.assignee}</td>
        <td><span class="priority-dot priority-${prClass}"></span>${t.priority}</td>
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:0.8rem">${t.due}</span></td>
        <td><span class="status-badge status-badge--${statusClass || 'info'}">${t.status}</span></td>
        <td>
          <div class="maturity-gauge">
            <div class="maturity-bar"><div class="maturity-bar-fill ${matClass}" style="width:${t.maturity}%"></div></div>
            <span class="maturity-pct">${t.maturity}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  renderKanban();
}

function renderKanban() {
  const columns = {
    'To Do': { el: document.getElementById('kanban-todo'), count: document.getElementById('kanban-todo-count') },
    'In Progress': { el: document.getElementById('kanban-progress'), count: document.getElementById('kanban-progress-count') },
    'In Review': { el: document.getElementById('kanban-review'), count: document.getElementById('kanban-review-count') },
    'Done': { el: document.getElementById('kanban-done'), count: document.getElementById('kanban-done-count') },
  };

  Object.values(columns).forEach(c => { if (c.el) c.el.innerHTML = ''; });

  MOCK.tasks.forEach(t => {
    const col = columns[t.status];
    if (!col || !col.el) return;
    const srcClass = t.source.toLowerCase();
    const typeClass = t.type.toLowerCase();
    const initials = t.assignee.split(' ').map(n => n[0]).join('');
    const isOverdue = new Date(t.due) < new Date() && t.status !== 'Done';

    col.el.innerHTML += `<div class="kanban-card">
      <div class="kanban-card-title">${t.title}</div>
      <div class="kanban-card-meta">
        <span class="type-badge type-${typeClass}">${t.type}</span>
        <span class="source-tag source-tag--${srcClass}">${t.source}</span>
        <span class="kanban-card-due ${isOverdue ? 'overdue' : ''}">${t.due}</span>
        <span class="kanban-card-assignee">${initials}</span>
      </div>
    </div>`;
  });

  Object.entries(columns).forEach(([status, col]) => {
    if (col.count) col.count.textContent = MOCK.tasks.filter(t => t.status === status).length;
  });
}

// Traceability matrix: DOORS (Requirement/Spec[]) -> ALM (Epic/per-Spec Story/Task/Review) -> QC (Component Test)
function renderTraceability() {
  const tbody = document.getElementById('trace-matrix-tbody');
  const healthBar = document.getElementById('trace-health-bar');
  if (!tbody) return;

  const qcStatusClass = s => (s === 'Approved' || s === 'Passed') ? 'ok' : (s === 'Not Run' || s === 'Draft') ? 'bad' : 'warn';
  const reviewStatusClass = s => s === 'Approved' ? 'ok' : s === 'Pending' ? 'info' : 'warn';
  const taskStatusClass = s => s === 'Done' ? 'ok' : s === 'In Progress' ? 'info' : 'info';
  const progressClass = p => p >= 70 ? 'ok' : p >= 40 ? 'warn' : 'bad';
  const ratioClass = (done, total) => done === total ? 'ok' : done === 0 ? 'bad' : 'warn';
  const arrow = '<svg class="pipe-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // Swimlane pipeline detail (DOORS -> ALM -> QC); one Requirement can fan out into multiple Specs, each driving its own Story chain
  const buildDetail = req => `
    <div class="pipeline-row">
      <div class="lane-zone lane-zone--doors">
        <div class="pipe-node">
          <span class="pipe-node-id">${req.reqId}</span>
          <span class="pipe-node-title">${req.reqName}</span>
        </div>
        ${arrow}
        ${req.specs.map(spec => `
          <div class="pipe-node">
            <span class="pipe-node-id">${spec.id}</span>
            <span class="pipe-node-title">Spec: ${spec.name}</span>
            <span class="status-badge status-badge--${qcStatusClass(spec.status)}">${spec.status}</span>
          </div>
        `).join('')}
      </div>
      ${arrow}
      <div class="lane-zone lane-zone--alm">
        <div class="pipe-node">
          <span class="type-badge type-epic">EPIC</span>
          <span class="pipe-node-id">${req.epic.id}</span>
          <span class="pipe-node-title">${req.epic.title}</span>
          <div class="pipe-ring pipe-ring--${progressClass(req.epic.progress)}">${req.epic.progress}%</div>
        </div>
        ${req.specs.map(spec => spec.stories.map(story => `
          ${arrow}
          <div class="pipe-node">
            <span class="type-badge type-story">Story</span>
            <span class="pipe-node-id">${story.id}</span>
            <span class="pipe-node-title">${story.title}</span>
            <span class="pipe-node-ref">⤷ realizes ${spec.id}</span>
            <div class="pipe-ring pipe-ring--${progressClass(story.progress)}">${story.progress}%</div>
          </div>
          ${arrow}
          <div class="task-stack">
            ${story.tasks.map(task => `
              <div class="pipe-node">
                <span class="type-badge type-task">Task</span>
                <span class="pipe-node-id">${task.id}</span>
                <span class="pipe-node-title">${task.title}</span>
                <span class="status-badge status-badge--${taskStatusClass(task.status)}">${task.status}</span>
              </div>
              <div class="pipe-node" style="opacity:0.85">
                <span class="type-badge type-review">Review</span>
                <span class="pipe-node-title">Reviewer: ${task.review.reviewer}</span>
                <span class="status-badge status-badge--${reviewStatusClass(task.review.status)}">${task.review.status}</span>
              </div>
            `).join('')}
          </div>
        `).join('')).join('')}
      </div>
      ${arrow}
      <div class="lane-zone lane-zone--qc">
        ${req.specs.map(spec => spec.stories.map(story => `
          <div class="pipe-node">
            <span class="pipe-node-id">${story.qc.componentTest}</span>
            <span class="pipe-node-title">Component Test</span>
            <span class="status-badge status-badge--${qcStatusClass(story.qc.testStatus)}">${story.qc.testStatus}</span>
          </div>
        `).join('')).join('')}
      </div>
    </div>
  `;

  const healthCounts = { ok: 0, warn: 0, bad: 0 };
  let progressSum = 0;

  tbody.innerHTML = MOCK.traceability.map((req, i) => {
    healthCounts[req.health.level]++;
    progressSum += req.epic.progress;

    const allStories = req.specs.flatMap(s => s.stories);
    const allTasks = allStories.flatMap(s => s.tasks);
    const doneTasks = allTasks.filter(t => t.status === 'Done').length;
    const passedTests = allStories.filter(s => s.qc.testStatus === 'Passed').length;
    const approvedSpecs = req.specs.filter(s => s.status === 'Approved').length;
    const storyProgress = Math.round(allStories.reduce((sum, s) => sum + s.progress, 0) / allStories.length);
    const detailId = `trace-detail-${i}`;

    const specCell = req.specs.length > 1
      ? `<span class="status-badge status-badge--${ratioClass(approvedSpecs, req.specs.length)}">${approvedSpecs}/${req.specs.length} Approved</span>`
      : `<span class="status-badge status-badge--${qcStatusClass(req.specs[0].status)}">${req.specs[0].status}</span>`;
    const ctCell = allStories.length > 1
      ? `<span class="status-badge status-badge--${ratioClass(passedTests, allStories.length)}">${passedTests}/${allStories.length} Passed</span>`
      : `<span class="status-badge status-badge--${qcStatusClass(allStories[0].qc.testStatus)}">${allStories[0].qc.testStatus}</span>`;

    return `
      <tr class="matrix-row--expandable" data-target="${detailId}">
        <td><strong>${req.reqId}</strong><br><span class="req-sub">${req.reqName}</span></td>
        <td>${specCell}</td>
        <td><span class="mini-bar"><span class="mini-bar-fill mini-bar-fill--${progressClass(req.epic.progress)}" style="width:${req.epic.progress}%"></span></span>${req.epic.progress}%</td>
        <td><span class="mini-bar"><span class="mini-bar-fill mini-bar-fill--${progressClass(storyProgress)}" style="width:${storyProgress}%"></span></span>${storyProgress}%</td>
        <td>${ctCell}</td>
        <td><span class="mini-bar"><span class="mini-bar-fill mini-bar-fill--${progressClass(doneTasks / allTasks.length * 100)}" style="width:${doneTasks / allTasks.length * 100}%"></span></span>${doneTasks}/${allTasks.length}</td>
        <td><span class="health-tag health-tag--${req.health.level}"><span class="health-dot health-dot--${req.health.level}"></span>${req.health.label}</span></td>
      </tr>
      <tr class="matrix-detail-row" id="${detailId}" style="display:none">
        <td colspan="7"><div class="expand-detail">${buildDetail(req)}</div></td>
      </tr>
    `;
  }).join('');

  if (healthBar) {
    const avgProgress = Math.round(progressSum / MOCK.traceability.length);
    healthBar.innerHTML = `
      <div class="health-chip"><span class="health-dot health-dot--ok"></span>健康 ${healthCounts.ok}</div>
      <div class="health-chip"><span class="health-dot health-dot--warn"></span>风险 ${healthCounts.warn}</div>
      <div class="health-chip"><span class="health-dot health-dot--bad"></span>阻塞 ${healthCounts.bad}</div>
      <div class="health-progress">
        <span class="health-progress-label">整体完成度</span>
        <div class="health-progress-bar"><div class="health-progress-fill" style="width:${avgProgress}%"></div></div>
        <span class="health-progress-pct">${avgProgress}%</span>
      </div>
    `;
  }

  document.querySelectorAll('.matrix-row--expandable').forEach(row => {
    row.addEventListener('click', () => {
      const detail = document.getElementById(row.dataset.target);
      if (detail) detail.style.display = detail.style.display === 'none' ? '' : 'none';
    });
  });
}

// Timeline milestones
function renderMilestones() {
  const el = document.getElementById('timeline-milestones');
  if (!el) return;
  el.innerHTML = MOCK.milestones.map(m => `
    <div class="timeline-item ${m.urgency}">
      <span class="timeline-date">${m.date}</span>
      <div class="timeline-content">
        <div class="timeline-title">${m.title}</div>
        <div class="timeline-desc">${m.desc}</div>
      </div>
    </div>
  `).join('');
}

// Risks
function renderRisks() {
  const el = document.getElementById('risk-list');
  if (!el) return;
  el.innerHTML = MOCK.risks.map(r => `
    <div class="risk-item risk-${r.level}">
      <span class="risk-level">${r.level}</span>
      <div class="risk-content">
        <div class="risk-title">${r.title}</div>
        <div class="risk-desc">${r.desc}</div>
      </div>
      <span class="risk-project">${r.project}</span>
    </div>
  `).join('');
}

// Notifications
function renderNotifications() {
  const el = document.getElementById('notification-list');
  if (!el) return;

  const iconSVGs = {
    due: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
    risk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    update: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  const iconClass = { due: 'due', risk: 'risk', update: 'update' };

  el.innerHTML = MOCK.notifications.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <div class="notif-icon notif-icon--${iconClass[n.type]}">${iconSVGs[n.type]}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-desc">${n.desc}</div>
        <div class="notif-meta">
          <span class="notif-time">${n.time}</span>
          <span class="notif-tag notif-tag--${n.type}">${n.type === 'due' ? 'Due Date' : n.type === 'risk' ? 'Risk Alert' : 'Status Update'}</span>
        </div>
      </div>
    </div>
  `).join('');

  const badge = document.getElementById('notif-badge');
  const unreadCount = MOCK.notifications.filter(n => n.unread).length;
  if (badge) badge.textContent = unreadCount;

  document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
    MOCK.notifications.forEach(n => n.unread = false);
    renderNotifications();
  });
}

// Feature checklist for wizard
function renderFeatureChecklist() {
  const el = document.getElementById('feature-checklist');
  if (!el) return;
  el.innerHTML = MOCK.features.map((f, i) => `
    <label class="feature-item">
      <input type="checkbox" ${f.checked ? 'checked' : ''}>
      <span class="feature-item-label">${f.name}</span>
      <span class="feature-item-id">${f.id}</span>
    </label>
  `).join('');
}

// BEG Wizard
let wizardStep = 1;

function openBEGWizard() {
  wizardStep = 1;
  updateWizardUI();
  document.getElementById('modal-beg-wizard').classList.add('open');
}

function closeBEGWizard() {
  document.getElementById('modal-beg-wizard').classList.remove('open');
}

function updateWizardUI() {
  document.querySelectorAll('.wizard-step').forEach(s => {
    const step = parseInt(s.dataset.step);
    s.classList.toggle('active', step === wizardStep);
    s.classList.toggle('done', step < wizardStep);
  });
  document.querySelectorAll('.wizard-panel').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.panel) === wizardStep);
  });

  const prevBtn = document.getElementById('wizard-prev');
  const nextBtn = document.getElementById('wizard-next');
  if (prevBtn) prevBtn.style.display = wizardStep === 1 ? 'none' : '';
  if (nextBtn) nextBtn.textContent = wizardStep === 3 ? 'Generate in ALM' : 'Next';
}

function initWizard() {
  document.getElementById('modal-close-beg')?.addEventListener('click', closeBEGWizard);
  document.getElementById('modal-beg-wizard')?.addEventListener('click', e => {
    if (e.target.id === 'modal-beg-wizard') closeBEGWizard();
  });

  document.getElementById('wizard-next')?.addEventListener('click', () => {
    if (wizardStep < 3) { wizardStep++; updateWizardUI(); }
    else {
      closeBEGWizard();
      showToast('Tasks generated successfully in ALM!');
    }
  });

  document.getElementById('wizard-prev')?.addEventListener('click', () => {
    if (wizardStep > 1) { wizardStep--; updateWizardUI(); }
  });

  document.getElementById('btn-create-baseline')?.addEventListener('click', openBEGWizard);
}

// View toggle (table/kanban)
function initViewToggle() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.getElementById('task-table-view')?.classList.toggle('active', view === 'table');
      document.getElementById('task-board-view')?.classList.toggle('active', view === 'board');
      document.getElementById('task-trace-view')?.classList.toggle('active', view === 'trace');
    });
  });
}

// Toast notification
function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; background:#10b981; color:#fff;
    padding:12px 20px; border-radius:8px; font-size:0.85rem; font-weight:600;
    z-index:9999; animation:fadeIn 0.3s ease;
    box-shadow: 0 4px 20px rgba(16,185,129,0.3);
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2500);
  setTimeout(() => toast.remove(), 3000);
}

// Report generation
document.getElementById('btn-generate-report')?.addEventListener('click', () => {
  showToast('Weekly report generated and sent to SWPCM!');
});

document.getElementById('btn-export-kpi')?.addEventListener('click', () => {
  showToast('SWKPI report exported successfully!');
});
