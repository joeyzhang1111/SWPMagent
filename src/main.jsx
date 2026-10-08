import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import './styles/style.css';
import './styles/dashboard.css';
import './styles/baseline.css';
import './styles/tasks.css';
import './styles/kpi.css';
import './styles/notifications.css';
import './styles/canvas-editor.css';
import './styles/toast.css';
import './styles/agent-monitor.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
