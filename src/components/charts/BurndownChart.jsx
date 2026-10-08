import React from 'react';
import { MOCK } from '../../data/mockData.js';
import { useChartJs, useChartRef } from './useChartJs.js';

export default function BurndownChart() {
  const canvasRef = useChartRef();

  useChartJs(canvasRef, () => ({
    type: 'line',
    data: {
      labels: MOCK.burndown.labels,
      datasets: [
        {
          label: 'Ideal',
          data: MOCK.burndown.ideal,
          borderColor: '#475569',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.1,
        },
        {
          label: 'Actual',
          data: MOCK.burndown.actual,
          borderColor: '#2563eb',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#2563eb',
          tension: 0.3,
        },
        {
          label: 'Predicted',
          data: MOCK.burndown.predicted,
          borderColor: '#d97706',
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: '#d97706',
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
        y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.28)' } },
      },
    },
  }));

  return <canvas ref={canvasRef} height="220" />;
}
