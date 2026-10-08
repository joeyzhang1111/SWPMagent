import React, { createContext, useContext, useMemo, useState } from 'react';
import { MOCK } from '../data/mockData.js';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(MOCK.notifications);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const markAllRead = () => {
    setNotifications((list) => list.map((n) => ({ ...n, unread: false })));
  };

  const value = { notifications, unreadCount, markAllRead };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
