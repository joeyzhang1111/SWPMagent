import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../nav.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';

export default function Sidebar() {
  const { unreadCount } = useNotifications();

  return (
    <nav className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg viewBox="0 0 32 32" fill="none">
            <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2.5" />
            <path d="M9 16h14M16 9v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="logo-text">SWPM</span>
      </div>

      <ul className="nav-list">
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.path}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.key === 'notifications' && (
                <span className="nav-badge" id="notif-badge">{unreadCount}</span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <div className="data-sources">
          <div className="source-dot source-alm" title="ALM Connected"></div>
          <div className="source-dot source-qc" title="QC Connected"></div>
          <div className="source-dot source-doors" title="DOORS Connected"></div>
        </div>
        <span className="sidebar-version">v1.0 Demo</span>
      </div>
    </nav>
  );
}
