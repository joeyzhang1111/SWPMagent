import React from 'react';
import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../nav.jsx';

export default function TopBar({ editMode, onToggleEditMode, onResetLayout }) {
  const location = useLocation();
  const current = NAV_ITEMS.find((n) => location.pathname.startsWith(n.path)) || NAV_ITEMS[0];

  return (
    <>
      <header className="top-bar">
        <div className="top-bar-left">
          <h1 className="page-title">{current.title}</h1>
          <span className="page-subtitle">{current.subtitle}</span>
        </div>
        <div className="top-bar-right">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search projects, tasks..." />
          </div>
          <button
            className={'btn btn-secondary' + (editMode ? ' active' : '')}
            id="btn-toggle-layout-edit"
            title="Enable drag & resize layout editing on this page"
            onClick={onToggleEditMode}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            Edit Layout
          </button>
          <button
            className="btn btn-secondary"
            id="btn-reset-layout-edit"
            title="Reset custom layout back to default"
            onClick={onResetLayout}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
          </button>
          <div className="user-avatar">JH</div>
        </div>
      </header>

      {editMode && (
        <div className="canvas-edit-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
          Layout edit mode is on — drag a card to move it, drag the blue corner to resize. Your layout is saved automatically.
        </div>
      )}
    </>
  );
}
