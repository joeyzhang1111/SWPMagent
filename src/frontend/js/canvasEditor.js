// Layout Canvas Editor
// Lets the user toggle an "Edit Layout" mode where dashboard cards become
// freely draggable / resizable directly in the browser. Positions persist
// in localStorage so the custom layout survives a page reload.
(function () {
  const STORAGE_KEY = 'swpm-canvas-layout-v1';
  // Grid containers whose direct children act as movable/resizable "canvas blocks"
  const CANVAS_SELECTORS = ['.stat-cards', '.dashboard-grid', '.kpi-grid', '.report-grid'];
  const MIN_WIDTH = 160;
  const MIN_HEIGHT = 90;

  let editMode = false;
  let layoutData = loadLayout();

  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('btn-toggle-layout-edit');
    const resetBtn = document.getElementById('btn-reset-layout-edit');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleEditMode);
    if (resetBtn) resetBtn.addEventListener('click', resetLayout);

    // Restore any previously saved layout for the page shown on load.
    applyVisibleCanvases();

    // Re-check canvases whenever the user switches pages via the sidebar.
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => requestAnimationFrame(applyVisibleCanvases));
    });
  });

  function loadLayout() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveLayout() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutData));
  }

  function resetLayout() {
    layoutData = {};
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function isVisible(el) {
    return !!el.offsetParent;
  }

  function toggleEditMode() {
    editMode = !editMode;
    document.body.classList.toggle('layout-edit-mode', editMode);
    const btn = document.getElementById('btn-toggle-layout-edit');
    if (btn) btn.classList.toggle('active', editMode);

    document.querySelectorAll('.canvas-root').forEach(root => {
      root.classList.toggle('canvas-active', editMode && isVisible(root));
    });

    if (editMode) applyVisibleCanvases();
  }

  // Canvasify every canvas-root that is currently visible and not yet set up.
  function applyVisibleCanvases() {
    CANVAS_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(root => {
        if (!isVisible(root)) return;
        if (!root.classList.contains('canvas-root')) {
          canvasifyRoot(root, selector);
        }
        root.classList.toggle('canvas-active', editMode);
      });
    });
  }

  function canvasifyRoot(root, key) {
    const children = Array.from(root.children).filter(c => !c.classList.contains('canvas-block'));
    if (children.length === 0) return;

    root.classList.add('canvas-root');
    const rootRect = root.getBoundingClientRect();
    const saved = layoutData[key] || {};
    let maxBottom = 0;

    children.forEach((child, idx) => {
      const rect = child.getBoundingClientRect();
      const fallback = {
        left: rect.left - rootRect.left,
        top: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
      };
      const pos = saved[idx] || fallback;

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
      addResizeHandle(child);
      makeDraggable(child, root, key, idx);
    });

    root.style.minHeight = (maxBottom + 16) + 'px';
  }

  function addResizeHandle(block) {
    const handle = document.createElement('div');
    handle.className = 'canvas-resize-handle';
    handle.title = 'Drag to resize';
    block.appendChild(handle);

    handle.addEventListener('mousedown', (e) => {
      if (!editMode) return;
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
        persistBlock(block);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function makeDraggable(block, root, key, idx) {
    block.addEventListener('mousedown', (e) => {
      if (!editMode) return;
      // Let interactive controls and the resize handle work normally.
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
        persistBlock(block);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function persistBlock(block) {
    const root = block.closest('.canvas-root');
    if (!root) return;
    const key = CANVAS_SELECTORS.find(sel => root.matches(sel));
    if (!key) return;
    const idx = block.dataset.blockKey;

    if (!layoutData[key]) layoutData[key] = {};
    layoutData[key][idx] = {
      left: block.offsetLeft,
      top: block.offsetTop,
      width: block.offsetWidth,
      height: block.offsetHeight,
    };

    let maxBottom = 0;
    root.querySelectorAll('.canvas-block').forEach(b => {
      maxBottom = Math.max(maxBottom, b.offsetTop + b.offsetHeight);
    });
    root.style.minHeight = (maxBottom + 16) + 'px';

    saveLayout();
  }
})();
