import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = '#e2e8f0';
Chart.defaults.font.family = "'DM Sans', sans-serif";

// Creates a Chart.js instance on the given canvas ref and tears it down on unmount / config change.
export function useChartJs(canvasRef, buildConfig, deps = []) {
  useEffect(() => {
    const ctx = canvasRef.current;
    if (!ctx) return undefined;
    const chart = new Chart(ctx, buildConfig());
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useChartRef() {
  return useRef(null);
}
