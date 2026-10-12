import React, { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import { AnalysisProvider } from './context/AnalysisContext.jsx';
import { resetCanvasLayout, useCanvasEditor } from './hooks/useCanvasEditor.js';
import DashboardPage from './pages/DashboardPage.jsx';
import BaselinePage from './pages/BaselinePage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import KpiPage from './pages/KpiPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import AgentMonitorPage from './pages/AgentMonitorPage.jsx';

function AppShell() {
  const [editMode, setEditMode] = useState(false);
  const location = useLocation();

  useCanvasEditor(editMode, [location.pathname]);

  return (
    <>
      <Sidebar />
      <main className="main-content" id="main-content">
        <TopBar
          editMode={editMode}
          onToggleEditMode={() => setEditMode((enabled) => !enabled)}
          onResetLayout={resetCanvasLayout}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/baseline" element={<BaselinePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/kpi" element={<KpiPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/agent-monitor" element={<AgentMonitorPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <NotificationsProvider>
      <ToastProvider>
        <AnalysisProvider>
          <AppShell />
        </AnalysisProvider>
      </ToastProvider>
    </NotificationsProvider>
  );
}
