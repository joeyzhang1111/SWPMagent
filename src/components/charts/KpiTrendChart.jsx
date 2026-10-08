import React from 'react';
import { MOCK } from '../../data/mockData.js';
import { useChartJs, useChartRef } from './useChartJs.js';

export default function KpiTrendChart() {
  const canvasRef = useChartRef();

  useChartJs(canvasRef, () => ({
    type: 'line',
    data: {
      labels: MOCK.kpiTrend.labels,
      datasets: [
        {
          label: 'Req Mgmt Checklist (%)',
          data: MOCK.kpiTrend.reqMgmt,
          borderColor: '#dc2626',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#dc2626',
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Effort Deviation (%)',
          data: MOCK.kpiTrend.effortCtrl,
          borderColor: '#d97706',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#d97706',
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Test Coverage (%)',
          data: MOCK.kpiTrend.testCoverage,
          borderColor: '#059669',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#059669',
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
          grid: { color: 'rgba(148, 163, 184, 0.28)' },
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
  }));

  return <canvas ref={canvasRef} height="200" />;
}
