// ── slab shell ──

const desktop = document.getElementById('desktop');
const taskbarApps = document.getElementById('taskbar-apps');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const startGrid = document.getElementById('start-grid');
const clockEl = document.getElementById('taskbar-clock');

let windows = [];
let zCounter = 10;

// ── Clock ──

function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  clockEl.textContent = `${h}:${m}`;
}
updateClock();
setInterval(updateClock, 10000);

// ── Start Screen ──

startBtn.addEventListener('click', () => {
  const open = !startScreen.classList.contains('hidden');
  if (open) {
    closeStart();
  } else {
    openStart();
  }
});

function openStart() {
  startScreen.classList.remove('hidden');
  startBtn.classList.add('active');
}

function closeStart() {
  startScreen.classList.add('hidden');
  startBtn.classList.remove('active');
}

// close start when clicking backdrop
startScreen.addEventListener('click', (e) => {
  if (e.target === startScreen) closeStart();
});

// ── App Registry ──

const apps = [
  {
    id: 'terminal',
    name: 'Terminal',
    color: 'gray',
    tile: 'wide',
    launch: () => createWindow('terminal', 'Terminal', buildTerminalContent(), 700, 450),
  },
  {
    id: 'sysmon',
    name: 'System',
    color: 'red',
    tile: 'wide',
    launch: () => createWindow('sysmon', 'System Monitor', buildSysmonContent(), 600, 400),
  },
  {
    id: 'files',
    name: 'Files',
    color: 'gray',
    tile: 'normal',
    launch: () => createWindow('files', 'Files', buildFilesContent(), 800, 500),
  },
  {
    id: 'editor',
    name: 'Editor',
    color: 'white',
    tile: 'normal',
    launch: () => createWindow('editor', 'Text Editor', buildEditorContent(), 600, 500),
  },
  {
    id: 'services',
    name: 'Services',
    color: 'gray',
    tile: 'normal',
    launch: () => createWindow('services', 'Services', buildServicesContent(), 550, 400),
  },
  {
    id: 'logs',
    name: 'Logs',
    color: 'gray',
    tile: 'normal',
    launch: () => createWindow('logs', 'Log Viewer', buildLogsContent(), 700, 400),
  },
];

// ── Build Start Tiles ──

apps.forEach(app => {
  const tile = document.createElement('div');
  tile.className = `slab-tile slab-tile--${app.color}`;
  if (app.tile === 'wide') tile.style.gridColumn = 'span 2';

  const label = document.createElement('div');
  label.className = 'slab-label';
  if (app.color === 'red') label.style.color = 'rgba(255,255,255,.6)';
  label.textContent = 'app';

  const title = document.createElement('div');
  title.className = 'slab-tile-title';
  if (app.color === 'white') title.style.color = 'var(--black)';
  title.textContent = app.name;

  tile.appendChild(label);
  tile.appendChild(title);

  tile.addEventListener('click', () => {
    app.launch();
    closeStart();
  });

  startGrid.appendChild(tile);
});

// ── Window Management ──

function createWindow(id, title, content, w, h) {
  const win = document.createElement('div');
  win.className = 'slab-window';
  win.dataset.id = id + '-' + Date.now();
  win.style.width = w + 'px';
  win.style.height = h + 'px';

  // center with slight random offset
  const ox = Math.round((window.innerWidth - w) / 2 + (Math.random() - 0.5) * 80);
  const oy = Math.round((window.innerHeight - h - 68) / 2 + (Math.random() - 0.5) * 60);
  win.style.left = Math.max(0, ox) + 'px';
  win.style.top = Math.max(0, oy) + 'px';

  // title bar
  const titlebar = document.createElement('div');
  titlebar.className = 'window-titlebar';

  const titleEl = document.createElement('span');
  titleEl.className = 'window-title';
  titleEl.textContent = title;

  const controls = document.createElement('div');
  controls.className = 'window-controls';

  // minimize
  const minBtn = document.createElement('button');
  minBtn.className = 'window-ctrl window-ctrl--min';
  minBtn.innerHTML = `<svg viewBox="0 0 10 10"><line x1="1" y1="5" x2="9" y2="5"/></svg>`;
  minBtn.addEventListener('click', () => minimizeWindow(win));

  // maximize
  const maxBtn = document.createElement('button');
  maxBtn.className = 'window-ctrl window-ctrl--max';
  maxBtn.innerHTML = `<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none"/></svg>`;
  maxBtn.addEventListener('click', () => toggleMaximize(win));

  // close
  const closeBtn = document.createElement('button');
  closeBtn.className = 'window-ctrl window-ctrl--close';
  closeBtn.innerHTML = `<svg viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>`;
  closeBtn.addEventListener('click', () => destroyWindow(win));

  controls.appendChild(minBtn);
  controls.appendChild(maxBtn);
  controls.appendChild(closeBtn);
  titlebar.appendChild(titleEl);
  titlebar.appendChild(controls);

  // body
  const body = document.createElement('div');
  body.className = 'window-body';
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else {
    body.appendChild(content);
  }

  // resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'window-resize';

  win.appendChild(titlebar);
  win.appendChild(body);
  win.appendChild(resizeHandle);

  // focus on click
  win.addEventListener('mousedown', () => focusWindow(win));

  // drag
  enableDrag(win, titlebar);

  // resize
  enableResize(win, resizeHandle);

  desktop.appendChild(win);

  const entry = { el: win, id: win.dataset.id, title, minimized: false };
  windows.push(entry);
  addTaskbarEntry(entry);
  focusWindow(win);

  return win;
}

function focusWindow(win) {
  zCounter++;
  win.style.zIndex = zCounter;
  document.querySelectorAll('.slab-window').forEach(w => w.classList.remove('focused'));
  win.classList.remove('minimized');
  win.classList.add('focused');
  win.style.display = 'flex';

  // update taskbar
  document.querySelectorAll('.taskbar-app').forEach(a => a.classList.remove('focused'));
  const entry = document.querySelector(`.taskbar-app[data-id="${win.dataset.id}"]`);
  if (entry) entry.classList.add('focused');

  // mark not minimized
  const w = windows.find(w => w.id === win.dataset.id);
  if (w) w.minimized = false;
}

function minimizeWindow(win) {
  win.style.display = 'none';
  win.classList.remove('focused');
  const w = windows.find(w => w.id === win.dataset.id);
  if (w) w.minimized = true;

  document.querySelector(`.taskbar-app[data-id="${win.dataset.id}"]`)?.classList.remove('focused');
}

function toggleMaximize(win) {
  if (win.classList.contains('maximized')) {
    win.classList.remove('maximized');
    win.style.left = win.dataset.prevLeft;
    win.style.top = win.dataset.prevTop;
    win.style.width = win.dataset.prevWidth;
    win.style.height = win.dataset.prevHeight;
  } else {
    win.dataset.prevLeft = win.style.left;
    win.dataset.prevTop = win.style.top;
    win.dataset.prevWidth = win.style.width;
    win.dataset.prevHeight = win.style.height;
    win.classList.add('maximized');
  }
}

function destroyWindow(win) {
  const idx = windows.findIndex(w => w.id === win.dataset.id);
  if (idx !== -1) windows.splice(idx, 1);
  removeTaskbarEntry(win.dataset.id);
  win.remove();
}

// ── Taskbar Entries ──

function addTaskbarEntry(entry) {
  const btn = document.createElement('button');
  btn.className = 'taskbar-app focused';
  btn.dataset.id = entry.id;

  const dot = document.createElement('span');
  dot.className = 'taskbar-app-dot';
  btn.appendChild(dot);

  const name = document.createTextNode(entry.title);
  btn.appendChild(name);

  btn.addEventListener('click', () => {
    const w = windows.find(w => w.id === entry.id);
    if (!w) return;
    if (w.minimized || !w.el.classList.contains('focused')) {
      focusWindow(w.el);
    } else {
      minimizeWindow(w.el);
    }
  });

  taskbarApps.appendChild(btn);
}

function removeTaskbarEntry(id) {
  document.querySelector(`.taskbar-app[data-id="${id}"]`)?.remove();
}

// ── Drag ──

function enableDrag(win, handle) {
  let startX, startY, origX, origY;

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.window-ctrl')) return;
    if (win.classList.contains('maximized')) return;

    startX = e.clientX;
    startY = e.clientY;
    origX = win.offsetLeft;
    origY = win.offsetTop;

    const onMove = (e) => {
      win.style.left = (origX + e.clientX - startX) + 'px';
      win.style.top = (origY + e.clientY - startY) + 'px';
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Resize ──

function enableResize(win, handle) {
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = win.offsetWidth;
    const startH = win.offsetHeight;

    const onMove = (e) => {
      win.style.width = Math.max(300, startW + e.clientX - startX) + 'px';
      win.style.height = Math.max(200, startH + e.clientY - startY) + 'px';
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Placeholder App Content ──

function buildTerminalContent() {
  const el = document.createElement('div');
  el.style.cssText = 'font-family:var(--font-mono);font-size:.8rem;color:var(--gray-300);height:100%;display:flex;flex-direction:column;';
  el.innerHTML = `
    <div style="flex:1;overflow-y:auto;padding-bottom:.5rem;">
      <div style="color:var(--gray-500);">slab terminal — shell not connected</div>
      <div style="color:var(--gray-500);margin-top:.3rem;">waiting for backend...</div>
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;border-top:1px solid var(--gray-700);padding-top:.5rem;">
      <span style="color:var(--red);">$</span>
      <input type="text" style="flex:1;background:transparent;border:none;color:var(--white);font-family:var(--font-mono);font-size:.8rem;outline:none;" placeholder="..." />
    </div>
  `;
  return el;
}

function buildSysmonContent() {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
      <div class="slab-tile slab-tile--red" style="padding:1rem;">
        <div class="slab-tile-subtitle">CPU</div>
        <div class="slab-tile-value">--%</div>
      </div>
      <div class="slab-tile" style="padding:1rem;">
        <div class="slab-tile-subtitle">Memory</div>
        <div class="slab-tile-value">--</div>
      </div>
      <div class="slab-tile" style="padding:1rem;">
        <div class="slab-tile-subtitle">Disk</div>
        <div class="slab-tile-value">--</div>
      </div>
      <div class="slab-tile" style="padding:1rem;">
        <div class="slab-tile-subtitle">Uptime</div>
        <div class="slab-tile-value">--</div>
      </div>
    </div>
  `;
}

function buildFilesContent() {
  const el = document.createElement('div');
  el.className = 'files-app';
  el.innerHTML = `
    <div class="files-sidebar">
      <div class="files-sidebar-section">
        <div class="files-sidebar-label">Places</div>
        <div class="files-sidebar-item" data-path-key="home">Home</div>
        <div class="files-sidebar-item" data-path-key="desktop">Desktop</div>
        <div class="files-sidebar-item" data-path-key="documents">Documents</div>
        <div class="files-sidebar-item" data-path-key="downloads">Downloads</div>
        <div class="files-sidebar-item" data-path-key="pictures">Pictures</div>
        <div class="files-sidebar-item" data-path-key="music">Music</div>
        <div class="files-sidebar-item" data-path-key="videos">Videos</div>
      </div>
      <div class="files-sidebar-section">
        <div class="files-sidebar-label">System</div>
        <div class="files-sidebar-item" data-path="/">Root (/)</div>
        <div class="files-sidebar-item" data-path="/tmp">Tmp</div>
        <div class="files-sidebar-item" data-path="/etc">Etc</div>
      </div>
    </div>
    <div class="files-main">
      <div class="files-toolbar">
        <button class="files-back">&larr;</button>
        <div class="files-pathbar">
          <div class="files-path"></div>
          <input class="files-path-input" type="text" spellcheck="false" />
        </div>
        <div class="files-toolbar-right">
          <button class="files-view-btn active" data-view="list" title="List">
            <svg viewBox="0 0 12 12" width="12" height="12"><rect x="0" y="1" width="12" height="2" fill="currentColor"/><rect x="0" y="5" width="12" height="2" fill="currentColor"/><rect x="0" y="9" width="12" height="2" fill="currentColor"/></svg>
          </button>
          <button class="files-view-btn" data-view="grid" title="Grid">
            <svg viewBox="0 0 12 12" width="12" height="12"><rect x="0" y="0" width="5" height="5" fill="currentColor"/><rect x="7" y="0" width="5" height="5" fill="currentColor"/><rect x="0" y="7" width="5" height="5" fill="currentColor"/><rect x="7" y="7" width="5" height="5" fill="currentColor"/></svg>
          </button>
        </div>
      </div>
      <div class="files-header">
        <span class="files-col-name">Name</span>
        <span class="files-col-size">Size</span>
        <span class="files-col-mod">Modified</span>
      </div>
      <div class="files-list"></div>
    </div>
  `;

  let currentPath = HOME;
  let viewMode = 'list';
  let editing = false;
  const pathEl = el.querySelector('.files-path');
  const pathInput = el.querySelector('.files-path-input');
  const pathBar = el.querySelector('.files-pathbar');
  const listEl = el.querySelector('.files-list');
  const headerEl = el.querySelector('.files-header');
  const backBtn = el.querySelector('.files-back');
  const sidebarItems = el.querySelectorAll('.files-sidebar-item');
  const viewBtns = el.querySelectorAll('.files-view-btn');
  let parentPath = null;
  let lastEntries = [];

  function resolveSidebarPath(key) {
    const map = { home: HOME, desktop: HOME + '/Desktop', documents: HOME + '/Documents', downloads: HOME + '/Downloads', pictures: HOME + '/Pictures', music: HOME + '/Music', videos: HOME + '/Videos' };
    return map[key] || HOME;
  }

  // sidebar navigation
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const key = item.dataset.pathKey;
      const path = key ? resolveSidebarPath(key) : item.dataset.path;
      navigate(path);
    });
  });

  // editable path bar — click to edit, enter to navigate, escape to cancel
  pathBar.addEventListener('click', (e) => {
    if (e.target.classList.contains('files-crumb')) return;
    if (editing) return;
    startEditing();
  });

  function startEditing() {
    editing = true;
    pathBar.classList.add('editing');
    pathInput.value = currentPath;
    pathInput.focus();
    pathInput.select();
  }

  function stopEditing() {
    editing = false;
    pathBar.classList.remove('editing');
  }

  pathInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const val = pathInput.value.trim();
      if (val) navigate(val);
      stopEditing();
    } else if (e.key === 'Escape') {
      stopEditing();
    }
  });

  pathInput.addEventListener('blur', () => stopEditing());

  // view toggle
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view;
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      headerEl.style.display = viewMode === 'grid' ? 'none' : '';
      renderEntries(lastEntries);
    });
  });

  function updateSidebarActive() {
    sidebarItems.forEach(item => {
      const key = item.dataset.pathKey;
      const path = key ? resolveSidebarPath(key) : item.dataset.path;
      item.classList.toggle('active', path === currentPath);
    });
  }

  async function navigate(path) {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      currentPath = data.path;
      parentPath = data.parent;
      lastEntries = data.entries;
      updateSidebarActive();

      // breadcrumb
      const parts = currentPath.split('/').filter(Boolean);
      let crumb = '<span class="files-crumb" data-path="/">/</span>';
      let accumulated = '';
      for (const part of parts) {
        accumulated += '/' + part;
        crumb += `<span class="files-crumb" data-path="${accumulated}">${part}/</span>`;
      }
      pathEl.innerHTML = crumb;
      pathEl.querySelectorAll('.files-crumb').forEach(c => {
        c.addEventListener('click', (e) => {
          e.stopPropagation();
          navigate(c.dataset.path);
        });
      });

      renderEntries(data.entries);
    } catch (e) {
      listEl.innerHTML = '<div class="files-error">failed to load directory</div>';
    }
  }

  // lazy image loading — only load when visible, fade in/out
  let previewObserver = null;

  function setupPreviewObserver() {
    if (previewObserver) previewObserver.disconnect();
    previewObserver = new IntersectionObserver((entries) => {
      for (const ioEntry of entries) {
        const el = ioEntry.target;
        const imgLayer = el.querySelector('.files-preview-img');
        if (!imgLayer) continue;

        if (ioEntry.isIntersecting) {
          if (!el.dataset.loaded) {
            const img = new Image();
            img.onload = () => {
              imgLayer.style.backgroundImage = `url(${el.dataset.preview})`;
              imgLayer.classList.add('loaded');
              el.dataset.loaded = '1';
            };
            img.src = el.dataset.preview;
          } else {
            imgLayer.classList.add('loaded');
          }
        } else {
          imgLayer.classList.remove('loaded');
        }
      }
    }, { root: listEl, rootMargin: '100px 0px' });
  }

  function renderEntries(entries) {
    listEl.innerHTML = '';
    listEl.className = viewMode === 'grid' ? 'files-list files-list--grid' : 'files-list';
    setupPreviewObserver();

    for (const entry of entries) {
      const isImage = !entry.is_dir && isImageFile(entry.name);
      const imgUrl = isImage ? `/api/raw?path=${encodeURIComponent(currentPath + '/' + entry.name)}` : null;

      if (viewMode === 'grid') {
        const card = document.createElement('div');
        card.className = 'files-card';
        if (entry.is_dir) card.classList.add('files-card--dir');

        if (isImage) {
          card.classList.add('files-card--preview');
          card.dataset.preview = imgUrl;
          const imgLayer = document.createElement('div');
          imgLayer.className = 'files-preview-img';
          card.appendChild(imgLayer);
          previewObserver.observe(card);
        }

        const icon = document.createElement('div');
        icon.className = 'files-card-icon';
        icon.textContent = entry.is_dir ? '/' : (isImage ? '' : getFileIcon(entry.name));

        const name = document.createElement('div');
        name.className = 'files-card-name';
        name.textContent = entry.name;

        card.appendChild(icon);
        card.appendChild(name);

        if (entry.is_dir) {
          card.addEventListener('click', () => navigate(currentPath + '/' + entry.name));
        }

        listEl.appendChild(card);
      } else {
        const row = document.createElement('div');
        row.className = 'files-row';
        if (entry.is_dir) row.classList.add('files-row--dir');

        if (isImage) {
          row.classList.add('files-row--preview');
          row.dataset.preview = imgUrl;
          const imgLayer = document.createElement('div');
          imgLayer.className = 'files-preview-img';
          row.appendChild(imgLayer);
          previewObserver.observe(row);
        }

        const name = document.createElement('span');
        name.className = 'files-col-name';
        name.textContent = entry.is_dir ? entry.name + '/' : entry.name;

        const size = document.createElement('span');
        size.className = 'files-col-size';
        size.textContent = entry.is_dir ? '--' : formatSize(entry.size);

        const mod = document.createElement('span');
        mod.className = 'files-col-mod';
        mod.textContent = entry.modified ? formatDate(entry.modified) : '--';

        row.appendChild(name);
        row.appendChild(size);
        row.appendChild(mod);

        if (entry.is_dir) {
          row.addEventListener('click', () => navigate(currentPath + '/' + entry.name));
        }

        listEl.appendChild(row);
      }
    }
  }

  backBtn.addEventListener('click', () => {
    if (parentPath) navigate(parentPath);
  });

  navigate(HOME);
  return el;
}

// user info — populated at startup
let USER = 'user';
let HOME = '/home/user';
fetch('/api/user').then(r => r.json()).then(data => {
  USER = data.user;
  HOME = data.home;
}).catch(() => {});

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']);
function isImageFile(name) {
  const ext = name.split('.').pop().toLowerCase();
  return IMAGE_EXTS.has(ext);
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = { js: 'JS', ts: 'TS', rs: 'RS', py: 'PY', html: '<>', css: '{}', json: '{}', md: 'MD', txt: 'TXT', png: 'IMG', jpg: 'IMG', svg: 'SVG', mp4: 'VID', mp3: 'AUD', zip: 'ZIP', tar: 'TAR', gz: 'GZ', pdf: 'PDF', toml: 'CFG', yaml: 'CFG', yml: 'CFG', lock: 'LCK' };
  return icons[ext] || '·';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' K';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' M';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' G';
}

function formatDate(epoch) {
  const d = new Date(epoch * 1000);
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${mo}-${day} ${h}:${m}`;
}

function buildEditorContent() {
  const el = document.createElement('div');
  el.style.cssText = 'height:100%;display:flex;flex-direction:column;';
  el.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:.65rem;color:var(--gray-500);padding-bottom:.5rem;border-bottom:1px solid var(--gray-800);margin-bottom:.5rem;letter-spacing:.06em;text-transform:uppercase;">untitled</div>
    <textarea style="flex:1;background:transparent;border:none;color:var(--gray-300);font-family:var(--font-mono);font-size:.8rem;line-height:1.7;resize:none;outline:none;" placeholder="start typing..."></textarea>
  `;
  return el;
}

function buildServicesContent() {
  const services = ['sshd', 'nginx', 'docker', 'firewalld', 'NetworkManager'];
  const rows = services.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .6rem;background:var(--gray-800);">
      <span style="font-family:var(--font-mono);font-size:.75rem;">${s}</span>
      <span style="font-family:var(--font-mono);font-size:.6rem;color:var(--gray-500);letter-spacing:.06em;text-transform:uppercase;">waiting</span>
    </div>
  `).join('');
  return `<div style="display:flex;flex-direction:column;gap:2px;">${rows}</div>`;
}

function buildLogsContent() {
  return `
    <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--gray-500);line-height:1.8;">
      <div>waiting for backend...</div>
    </div>
  `;
}

// ── Keyboard ──

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!startScreen.classList.contains('hidden')) {
      closeStart();
    }
  }
});
