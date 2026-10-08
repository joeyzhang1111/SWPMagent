import React, { useMemo, useState } from 'react';
import { useNotifications } from '../context/NotificationsContext.jsx';

const typeLabels = { due: 'Due Date', risk: 'Risk Alert', update: 'Status Update' };

function NotificationIcon({ type }) {
  if (type === 'due') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>;
  if (type === 'risk') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [type, setType] = useState('');
  const visibleNotifications = useMemo(() => notifications.filter((notification) => !type || notification.type === type), [notifications, type]);

  return (
    <section className="page active" id="page-notifications">
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <select className="filter-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Notification type">
            <option value="">All Types</option><option value="due">Due Date</option><option value="risk">Risk Alert</option><option value="update">Status Update</option>
          </select>
        </div>
        <button className="btn btn-secondary" id="btn-mark-all-read" onClick={markAllRead} disabled={unreadCount === 0}>Mark All Read</button>
      </div>
      <div className="notification-list">
        {visibleNotifications.map((notification, index) => (
          <div className={`notif-item${notification.unread ? ' unread' : ''}`} key={`${notification.title}-${index}`}>
            <div className={`notif-icon notif-icon--${notification.type}`}><NotificationIcon type={notification.type} /></div>
            <div className="notif-body">
              <div className="notif-title">{notification.title}</div>
              <div className="notif-desc">{notification.desc}</div>
              <div className="notif-meta"><span className="notif-time">{notification.time}</span><span className={`notif-tag notif-tag--${notification.type}`}>{typeLabels[notification.type]}</span></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
