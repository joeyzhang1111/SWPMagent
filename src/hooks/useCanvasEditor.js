import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'swpm-canvas-layout-v1';
const CANVAS_SELECTORS = ['.stat-cards', '.dashboard-grid', '.kpi-grid', '.report-grid', '.agent-monitor-grid'];
const MIN_WIDTH = 160;
const MIN_HEIGHT = 90;

function loadLayout() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLayout(layoutData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutData));
}

export function resetCanvasLayout() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function isVisible(el) {
  return !!el.offsetParent;
}

// Applies drag/resize behaviour to the canvas-root grids of whichever page is currently mounted.
export function useCanvasEditor(editMode, deps = []) {
  const layoutRef = useRef(loadLayout());

  useEffect(() => {
    document.body.classList.toggle('layout-edit-mode', editMode);

    const cleanups = [];

    CANVAS_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((root) => {
        if (!isVisible(root)) return;
        const savedLayout = layoutRef.current[selector];
        const hasSavedLayout = savedLayout && Object.keys(savedLayout).length > 0;
        if (!editMode && !hasSavedLayout) {
          restoreNaturalLayout(root);
          return;
        }
        cleanups.push(canvasifyRoot(root, selector, layoutRef.current, editMode));
        root.classList.toggle('canvas-active', editMode);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn && fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, ...deps]);
}

function restoreNaturalLayout(root) {
  root.classList.remove('canvas-root', 'canvas-active');
  root.style.removeProperty('min-height');
  Array.from(root.children).forEach((child) => {
    child.classList.remove('canvas-block', 'dragging');
    delete child.dataset.blockKey;
    ['position', 'left', 'top', 'width', 'height'].forEach((property) => child.style.removeProperty(property));
    child.querySelectorAll('.canvas-resize-handle').forEach((handle) => handle.remove());
  });
}

function canvasifyRoot(root, key, layoutData, editMode) {
  // Re-process existing blocks after edit mode changes so their listeners and
  // resize handles are restored instead of silently disappearing.
  const children = Array.from(root.children);
  if (children.length === 0) return () => {};

  root.classList.add('canvas-root');
  const rootRect = root.getBoundingClientRect();
  // Measure every grid item before changing any item to absolute positioning.
  // Measuring inside the mutation loop makes the grid reflow after the first
  // item and causes the remaining cards to collapse onto the same position.
  const fallbacks = children.map((child) => {
    const rect = child.getBoundingClientRect();
    return {
      left: rect.left - rootRect.left,
      top: rect.top - rootRect.top,
      width: rect.width,
      height: rect.height,
    };
  });
  const saved = layoutData[key] || {};
  let maxBottom = 0;
  const removers = [];

  children.forEach((child, idx) => {
    const pos = saved[idx] || fallbacks[idx];

    child.classList.add('canvas-block');
    child.dataset.blockKey = String(idx);
    Object.assign(child.style, {
      position: 'absolute',
      left: pos.left + 'px',
      top: pos.top + 'px',
      width: pos.width + 'px',
      height: pos.height + 'px',
    });

    maxBottom = Math.max(maxBottom, pos.top + pos.height);
    removers.push(addResizeHandle(child, key, layoutData, editMode));
    removers.push(makeDraggable(child, key, layoutData, editMode));
  });

  root.style.minHeight = maxBottom + 16 + 'px';

  return () => removers.forEach((fn) => fn && fn());
}

function addResizeHandle(block, key, layoutData, editModeRef) {
  const handle = document.createElement('div');
  handle.className = 'canvas-resize-handle';
  handle.title = 'Drag to resize';
  block.appendChild(handle);

  const onMouseDown = (e) => {
    if (!document.body.classList.contains('layout-edit-mode')) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = block.offsetWidth;
    const startH = block.offsetHeight;

    const onMove = (ev) => {
      block.style.width = Math.max(MIN_WIDTH, startW + (ev.clientX - startX)) + 'px';
      block.style.height = Math.max(MIN_HEIGHT, startH + (ev.clientY - startY)) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      persistBlock(block, key, layoutData);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  handle.addEventListener('mousedown', onMouseDown);
  return () => {
    handle.removeEventListener('mousedown', onMouseDown);
    handle.remove();
  };
}

function makeDraggable(block, key, layoutData) {
  const onMouseDown = (e) => {
    if (!document.body.classList.contains('layout-edit-mode')) return;
    if (e.target.closest('select, button, input, a, .canvas-resize-handle')) return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = block.offsetLeft;
    const startTop = block.offsetTop;
    block.classList.add('dragging');

    const onMove = (ev) => {
      block.style.left = Math.max(0, startLeft + (ev.clientX - startX)) + 'px';
      block.style.top = Math.max(0, startTop + (ev.clientY - startY)) + 'px';
    };
    const onUp = () => {
      block.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      persistBlock(block, key, layoutData);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  block.addEventListener('mousedown', onMouseDown);
  return () => block.removeEventListener('mousedown', onMouseDown);
}

function persistBlock(block, key, layoutData) {
  const root = block.closest('.canvas-root');
  if (!root) return;
  const idx = block.dataset.blockKey;

  if (!layoutData[key]) layoutData[key] = {};
  layoutData[key][idx] = {
    left: block.offsetLeft,
    top: block.offsetTop,
    width: block.offsetWidth,
    height: block.offsetHeight,
  };

  let maxBottom = 0;
  root.querySelectorAll('.canvas-block').forEach((b) => {
    maxBottom = Math.max(maxBottom, b.offsetTop + b.offsetHeight);
  });
  root.style.minHeight = maxBottom + 16 + 'px';

  saveLayout(layoutData);
}
