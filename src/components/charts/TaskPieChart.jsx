import React from 'react';
import { MOCK } from '../../data/mockData.js';
import { useChartJs, useChartRef } from './useChartJs.js';

export default function TaskPieChart() {
  const canvasRef = useChartRef();

  useChartJs(canvasRef, () => {
    const statusCounts = { 'To Do': 0, 'In Progress': 0, 'In Review': 0, Done: 0 };
    MOCK.tasks.forEach((t) => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
    });

    return {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [
          {
            data: Object.values(statusCounts),
            backgroundColor: ['#94a3b8', '#2563eb', '#d97706', '#059669'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12 } },
        },
      },
    };
  });

  return <canvas ref={canvasRef} height="220" />;
}
