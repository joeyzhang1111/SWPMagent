// Chart rendering
const chartDefaults = {
  color: '#8b95b0',
  borderColor: '#1e2a45',
  font: { family: "'DM Sans', sans-serif" },
};

Chart.defaults.color = chartDefaults.color;
Chart.defaults.borderColor = chartDefaults.borderColor;
Chart.defaults.font.family = chartDefaults.font.family;

function renderBurndownChart() {
  const ctx = document.getElementById('burndownChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: MOCK.burndown.labels,
      datasets: [
        {
          label: 'Ideal',
          data: MOCK.burndown.ideal,
          borderColor: '#3b4a6b',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.1,
        },
        {
          label: 'Actual',
          data: MOCK.burndown.actual,
          borderColor: '#3b82f6',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
          tension: 0.3,
        },
        {
          label: 'Predicted',
          data: MOCK.burndown.predicted,
          borderColor: '#f59e0b',
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: '#f59e0b',
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 16 } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: '#1e2a4520' } },
      },
    },
  });
}

function renderTaskPieChart() {
  const ctx = document.getElementById('taskPieChart');
  if (!ctx) return;

  const statusCounts = { 'To Do': 0, 'In Progress': 0, 'In Review': 0, 'Done': 0 };
  MOCK.tasks.forEach(t => { if (statusCounts[t.status] !== undefined) statusCounts[t.status]++; });

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#5a6580', '#3b82f6', '#f59e0b', '#10b981'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12 } },
      },
    },
  });
}

function renderKpiTrendChart() {
  const ctx = document.getElementById('kpiTrendChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: MOCK.kpiTrend.labels,
      datasets: [
        {
          label: 'Req Mgmt Checklist (%)',
          data: MOCK.kpiTrend.reqMgmt,
          borderColor: '#ef4444',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#ef4444',
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Effort Deviation (%)',
          data: MOCK.kpiTrend.effortCtrl,
          borderColor: '#f59e0b',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b',
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Test Coverage (%)',
          data: MOCK.kpiTrend.testCoverage,
          borderColor: '#10b981',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 16 } },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          position: 'left',
          beginAtZero: true,
          max: 30,
          title: { display: true, text: 'Req / Effort %' },
          grid: { color: '#1e2a4520' },
        },
        y1: {
          position: 'right',
          min: 70,
          max: 100,
          title: { display: true, text: 'Coverage %' },
          grid: { display: false },
        },
      },
    },
  });
}

function initCharts() {
  renderBurndownChart();
  renderTaskPieChart();
  renderKpiTrendChart();
}
