// Shared nav/page metadata used by the Sidebar, TopBar and router config.
export const NAV_ITEMS = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    title: 'Dashboard',
    subtitle: 'Overview of all project activities',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: 'baseline',
    path: '/baseline',
    label: 'Baseline',
    title: 'Baseline Management',
    subtitle: 'Configure baselines and auto-generate tasks via BEG Wizard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h10" />
        <circle cx="19" cy="18" r="3" />
      </svg>
    ),
  },
  {
    key: 'tasks',
    path: '/tasks',
    label: 'Tasks',
    title: 'Task Tracking',
    subtitle: 'ALM / QC / DOORS task status with priority and maturity',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3 8-8" />
        <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" />
      </svg>
    ),
  },
  {
    key: 'kpi',
    path: '/kpi',
    label: 'SWKPI',
    title: 'SWKPI Dashboard',
    subtitle: 'Key performance indicators per release',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    key: 'reports',
    path: '/reports',
    label: 'Weekly Report',
    title: 'Weekly Report',
    subtitle: 'Auto-generated ALM-QC-DOORS consolidated report',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    key: 'agent-monitor',
    path: '/agent-monitor',
    label: 'Agent Monitor',
    title: 'Agent Monitor',
    subtitle: 'Automated task, timing, and quality monitoring',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 00-4 4v1H7a3 3 0 00-3 3v5a3 3 0 003 3h1l2 3h4l2-3h1a3 3 0 003-3v-5a3 3 0 00-3-3h-1V6a4 4 0 00-4-4z" />
        <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
        <path d="M9 15h6" />
      </svg>
    ),
  },
  {
    key: 'notifications',
    path: '/notifications',
    label: 'Notifications',
    title: 'Notifications',
    subtitle: 'Due-date reminders and automated alerts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
];
