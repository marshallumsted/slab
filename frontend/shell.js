// ── slab shell ──
// The shell owns windows, taskbar, tile grid, and the Slab API.
// It has zero knowledge of what apps exist — apps self-register.

// ── Slab API (global) ──

window.Slab = {
  _apps: {},
  _manifests: [],
  _bus: {},

  // Apps call this to register themselves
  register(id, appDef) {
    Slab._apps[id] = appDef;
  },

  // Shell services exposed to apps
  createWindow(id, title, content, w, h) {
    return createWindow(id, title, content, w, h);
  },

  // Query an app's live data
  query(appId) {
    const app = Slab._apps[appId];
    if (app && app.getData) return app.getData();
    return null;
  },

  // Request a capability from whatever app provides it
  request(capability, ...args) {
    for (const app of Object.values(Slab._apps)) {
      if (app.capabilities && app.capabilities[capability]) {
        return app.capabilities[capability](...args);
      }
    }
    return undefined;
  },

  // Event bus
  emit(event, data) {
    (Slab._bus[event] || []).forEach(fn => fn(data));
  },
  on(event, fn) {
    if (!Slab._bus[event]) Slab._bus[event] = [];
    Slab._bus[event].push(fn);
  },
};

// ── DOM refs ──

const desktop = document.getElementById('desktop');
const taskbarApps = document.getElementById('taskbar-apps');
const tileGrid = document.getElementById('tile-grid-inner');
const clockEl = document.getElementById('taskbar-clock');
const settingsPopup = document.getElementById('settings-popup');
const settingsBtn = document.getElementById('taskbar-settings');
const spawnContainer = document.getElementById('taskbar-spawn');

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

// ── Settings Popup ──

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsPopup.classList.toggle('hidden');
  if (!settingsPopup.classList.contains('hidden')) buildSettingsPopup();
});

document.addEventListener('click', (e) => {
  if (!settingsPopup.contains(e.target) && e.target !== settingsBtn) {
    settingsPopup.classList.add('hidden');
  }
});

function buildSettingsPopup() {
  const grid = document.getElementById('settings-popup-grid');
  fetch('/api/config').then(r => r.json()).then(cfg => {
    const g = cfg.settings?.general || {};
    const isDark = g.theme !== 'light';
    grid.innerHTML = `
      <div class="settings-popup-tile ${isDark ? 'active' : ''}" data-action="theme">
        <div class="settings-popup-tile-icon">${isDark ? '\u263E' : '\u2600'}</div>
        <div class="settings-popup-tile-label">${isDark ? 'Dark' : 'Light'}</div>
      </div>
      <div class="settings-popup-tile" data-action="open-settings">
        <div class="settings-popup-tile-icon">\u2699</div>
        <div class="settings-popup-tile-label">All Settings</div>
      </div>
    `;
    grid.querySelector('[data-action="theme"]').addEventListener('click', () => {
      const newTheme = isDark ? 'light' : 'dark';
      if (!cfg.settings) cfg.settings = {};
      if (!cfg.settings.general) cfg.settings.general = {};
      cfg.settings.general.theme = newTheme;
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: cfg.settings, places: cfg.places, network: cfg.network }),
      }).then(() => { applySettings(); settingsPopup.classList.add('hidden'); });
    });
    grid.querySelector('[data-action="open-settings"]').addEventListener('click', () => {
      settingsPopup.classList.add('hidden');
      launchApp('settings');
    });
  }).catch(() => {});
}

// ── App Discovery & Loading ──

const DEP_MAP = {
  xterm: [
    { type: 'css', url: 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css' },
    { type: 'js', url: 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js' },
    { type: 'js', url: 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js' },
    { type: 'js', url: 'https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.11.0/lib/addon-web-links.min.js' },
  ],
  monaco: [
    { type: 'js', url: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js' },
  ],
  marked: [
    { type: 'js', url: 'https://cdn.jsdelivr.net/npm/marked@15.0.7/lib/marked.umd.min.js' },
  ],
};

function loadResource(type, url) {
  return new Promise((resolve) => {
    if (type === 'css') {
      if (document.querySelector(`link[href="${url}"]`)) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    } else {
      if (document.querySelector(`script[src="${url}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    }
  });
}

async function initApps() {
  let manifests = [];
  try {
    const res = await fetch('/api/shell/apps');
    const data = await res.json();
    manifests = data.apps || [];
  } catch {}

  manifests.sort((a, b) => (a.order || 99) - (b.order || 99));
  Slab._manifests = manifests;

  // load external dependencies (deduplicated)
  const neededDeps = new Set();
  for (const m of manifests) {
    (m.dependencies || []).forEach(d => neededDeps.add(d));
  }
  const depPromises = [];
  for (const dep of neededDeps) {
    for (const r of (DEP_MAP[dep] || [])) {
      depPromises.push(loadResource(r.type, r.url));
    }
  }
  await Promise.all(depPromises);

  // load app scripts sequentially
  for (const m of manifests) {
    for (const js of (m.scripts || [])) {
      await loadResource('js', `/apps/${m.id}/${js}`);
    }
  }

  buildTileGrid(manifests);
  buildSpawnButtons(manifests);
  updateLiveTiles();
  setInterval(updateLiveTiles, 3000);
}

// ── Launch App ──

function launchApp(appId) {
  const app = Slab._apps[appId];
  const manifest = Slab._manifests.find(m => m.id === appId);
  if (!app || !app.buildApp) return;
  const content = app.buildApp();
  const w = manifest?.window?.width || 600;
  const h = manifest?.window?.height || 400;
  const name = manifest?.name || appId;
  createWindow(appId, name, content, w, h);
}

// ── Build Tile Grid ──

const tileElements = {};

function buildTileGrid(manifests) {
  tileGrid.innerHTML = '';
  if (manifests.length === 0) return;

  const label = document.createElement('div');
  label.className = 'tile-section-label';
  label.textContent = 'Slab';
  tileGrid.appendChild(label);

  for (const manifest of manifests) {
    const tile = document.createElement('div');
    const color = manifest.tile?.color || 'gray';
    tile.className = `live-tile live-tile--${color}`;
    if (manifest.tile?.size === 'wide') tile.classList.add('live-tile--wide');

    const tileLabel = document.createElement('div');
    tileLabel.className = 'live-tile-label';
    tileLabel.textContent = 'slab';

    const tileTitle = document.createElement('div');
    tileTitle.className = 'live-tile-title';
    tileTitle.textContent = manifest.name;

    tile.appendChild(tileLabel);
    tile.appendChild(tileTitle);

    const valueEl = document.createElement('div');
    valueEl.className = 'live-tile-value';
    tile.appendChild(valueEl);

    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'live-tile-subtitle';
    tile.appendChild(subtitleEl);

    const dataEl = document.createElement('div');
    dataEl.className = 'live-tile-data';
    tile.appendChild(dataEl);

    tile.addEventListener('click', () => launchApp(manifest.id));
    tileGrid.appendChild(tile);
    tileElements[manifest.id] = tile;
  }

  // system X11 apps
  fetch('/api/apps').then(r => r.json()).then(data => {
    if (!data.apps || data.apps.length === 0) return;
    const groups = {};
    const categoryOrder = ['Internet', 'Development', 'Media', 'Graphics', 'Office', 'Games', 'System', 'Utilities', 'Education', 'Settings', 'Other'];
    for (const app of data.apps) {
      const cat = app.categories[0] || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(app);
    }
    const sortedCats = Object.keys(groups).sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    for (const cat of sortedCats) {
      const catLabel = document.createElement('div');
      catLabel.className = 'tile-section-label';
      catLabel.textContent = cat;
      tileGrid.appendChild(catLabel);
      for (const app of groups[cat]) {
        const tile = document.createElement('div');
        tile.className = 'sys-app-tile';
        if (app.icon) {
          const iconEl = document.createElement('img');
          iconEl.className = 'sys-app-tile-icon';
          iconEl.src = `/api/apps/icon?name=${encodeURIComponent(app.icon)}&size=48`;
          iconEl.alt = '';
          iconEl.loading = 'lazy';
          iconEl.onerror = function() { this.style.display = 'none'; };
          tile.appendChild(iconEl);
        }
        const name = document.createElement('div');
        name.className = 'sys-app-tile-name';
        name.textContent = app.name;
        tile.appendChild(name);
        if (app.comment) tile.title = app.comment;
        tile.addEventListener('click', () => {
          if (xbridgeAvailable) launchInXbridge(app.exec, app.name);
          else showXbridgePrompt();
        });
        tileGrid.appendChild(tile);
      }
    }
  }).catch(() => {});
}

// ── Spawn Buttons ──

function buildSpawnButtons(manifests) {
  spawnContainer.innerHTML = '';
  for (const manifest of manifests) {
    for (const spawn of (manifest.spawn || [])) {
      const btn = document.createElement('button');
      btn.className = 'taskbar-spawn-btn';
      btn.title = spawn.label;
      btn.innerHTML = spawn.icon;
      btn.addEventListener('click', () => {
        const app = Slab._apps[manifest.id];
        if (!app) return;
        if (app.buildElement) {
          const el = app.buildElement(spawn.id);
          if (el) {
            createWindow(manifest.id, spawn.label, el,
              manifest.window?.width || 600, manifest.window?.height || 400);
            return;
          }
        }
        launchApp(manifest.id);
      });
      spawnContainer.appendChild(btn);
    }
  }
}

// ── Live Tiles ──

async function updateLiveTiles() {
  for (const manifest of Slab._manifests) {
    const app = Slab._apps[manifest.id];
    const tile = tileElements[manifest.id];
    if (!app || !tile) continue;

    const isRunning = windows.some(w => w.id.startsWith(manifest.id + '-'));
    tile.classList.toggle('running', isRunning);

    if (!app.getData) continue;
    const data = app.getData();
    if (!data) continue;

    const valueEl = tile.querySelector('.live-tile-value');
    const subtitleEl = tile.querySelector('.live-tile-subtitle');
    const dataEl = tile.querySelector('.live-tile-data');

    if (valueEl) valueEl.textContent = data.value || '';
    if (subtitleEl) subtitleEl.textContent = data.subtitle || '';
    if (dataEl && data.rows) {
      dataEl.innerHTML = data.rows.map(r =>
        `<div class="live-tile-row"><span>${r.label}</span><span>${r.value}</span></div>`
      ).join('');
    } else if (dataEl) {
      dataEl.innerHTML = '';
    }
  }
}

// ── Window Management ──

const isMobile = () => window.innerWidth <= 768;

function createWindow(id, title, content, w, h) {
  const win = document.createElement('div');
  win.className = 'slab-window';
  win.dataset.id = id + '-' + Date.now();

  if (isMobile()) {
    win.style.width = window.innerWidth + 'px';
    win.style.height = (window.innerHeight - 48) + 'px';
    win.style.left = '0px';
    win.style.top = '0px';
  } else {
    win.style.width = w + 'px';
    win.style.height = h + 'px';
    const ox = Math.round((window.innerWidth - w) / 2 + (Math.random() - 0.5) * 80);
    const oy = Math.round((window.innerHeight - h - 56) / 2 + (Math.random() - 0.5) * 60);
    win.style.left = Math.max(0, ox) + 'px';
    win.style.top = Math.max(0, oy) + 'px';
  }

  const titlebar = document.createElement('div');
  titlebar.className = 'window-titlebar';
  const titleEl = document.createElement('span');
  titleEl.className = 'window-title';
  titleEl.textContent = title;
  const controls = document.createElement('div');
  controls.className = 'window-controls';

  const minBtn = document.createElement('button');
  minBtn.className = 'window-ctrl window-ctrl--min';
  minBtn.innerHTML = `<svg viewBox="0 0 10 10"><line x1="1" y1="5" x2="9" y2="5"/></svg>`;
  minBtn.addEventListener('click', () => minimizeWindow(win));

  const maxBtn = document.createElement('button');
  maxBtn.className = 'window-ctrl window-ctrl--max';
  maxBtn.innerHTML = `<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none"/></svg>`;
  maxBtn.addEventListener('click', () => toggleMaximize(win));

  const closeBtn = document.createElement('button');
  closeBtn.className = 'window-ctrl window-ctrl--close';
  closeBtn.innerHTML = `<svg viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>`;
  closeBtn.addEventListener('click', () => destroyWindow(win));

  controls.appendChild(minBtn);
  controls.appendChild(maxBtn);
  controls.appendChild(closeBtn);
  titlebar.appendChild(titleEl);
  titlebar.appendChild(controls);

  const body = document.createElement('div');
  body.className = 'window-body';
  if (typeof content === 'string') body.innerHTML = content;
  else body.appendChild(content);

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'window-resize';

  win.appendChild(titlebar);
  win.appendChild(body);
  win.appendChild(resizeHandle);

  win.addEventListener('mousedown', () => focusWindow(win));
  win.addEventListener('touchstart', () => focusWindow(win), { passive: true });
  enableDrag(win, titlebar);
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
  document.querySelectorAll('.taskbar-app').forEach(a => a.classList.remove('focused'));
  const entry = document.querySelector(`.taskbar-app[data-id="${win.dataset.id}"]`);
  if (entry) entry.classList.add('focused');
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
  btn.appendChild(document.createTextNode(entry.title));
  btn.addEventListener('click', () => {
    const w = windows.find(w => w.id === entry.id);
    if (!w) return;
    if (w.minimized || !w.el.classList.contains('focused')) focusWindow(w.el);
    else minimizeWindow(w.el);
  });
  taskbarApps.appendChild(btn);
}

function removeTaskbarEntry(id) {
  document.querySelector(`.taskbar-app[data-id="${id}"]`)?.remove();
}

// ── Drag ──

function enableDrag(win, handle) {
  let startX, startY, origX, origY;
  function onStart(cx, cy) {
    if (win.classList.contains('maximized')) return false;
    startX = cx; startY = cy; origX = win.offsetLeft; origY = win.offsetTop;
    return true;
  }
  function onDrag(cx, cy) {
    win.style.left = (origX + cx - startX) + 'px';
    win.style.top = (origY + cy - startY) + 'px';
  }
  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.window-ctrl')) return;
    if (!onStart(e.clientX, e.clientY)) return;
    const onMove = (e) => onDrag(e.clientX, e.clientY);
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  handle.addEventListener('touchstart', (e) => {
    if (e.target.closest('.window-ctrl')) return;
    const t = e.touches[0];
    if (!onStart(t.clientX, t.clientY)) return;
    const onMove = (e) => { e.preventDefault(); onDrag(e.touches[0].clientX, e.touches[0].clientY); };
    const onEnd = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, { passive: true });
}

// ── Resize ──

function enableResize(win, handle) {
  let sx, sy, sw, sh;
  function onStart(cx, cy) { sx = cx; sy = cy; sw = win.offsetWidth; sh = win.offsetHeight; }
  function onDrag(cx, cy) {
    win.style.width = Math.max(300, sw + cx - sx) + 'px';
    win.style.height = Math.max(200, sh + cy - sy) + 'px';
  }
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    onStart(e.clientX, e.clientY);
    const onMove = (e) => onDrag(e.clientX, e.clientY);
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  handle.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    onStart(e.touches[0].clientX, e.touches[0].clientY);
    const onMove = (e) => { e.preventDefault(); onDrag(e.touches[0].clientX, e.touches[0].clientY); };
    const onEnd = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  });
}

// ── Apply Settings ──

function applySettings() {
  fetch('/api/config').then(r => r.json()).then(cfg => {
    const p = cfg.settings?.performance || {};
    const g = cfg.settings?.general || {};
    document.body.classList.toggle('no-animations', p.animations === false);
    document.body.classList.toggle('no-dot-grid', p.dot_grid === false);
    document.body.classList.toggle('no-blur', p.backdrop_blur === false);
    document.body.classList.toggle('theme-light', g.theme === 'light');
  }).catch(() => {});
}
applySettings();

// ── User Info ──

let USER = 'user';
let HOME = '/home/user';
let HOSTNAME = '';
fetch('/api/user').then(r => r.json()).then(data => {
  USER = data.user;
  HOME = data.home;
  HOSTNAME = data.hostname || '';
  document.title = `[S] ${HOSTNAME}`;
}).catch(() => {});

// ── X Bridge ──

let xbridgeAvailable = false;
fetch('/api/xbridge/status').then(r => r.json()).then(d => { xbridgeAvailable = d.available; }).catch(() => {});

function showXbridgePrompt() {
  const dlg = document.createElement('div');
  dlg.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:var(--overlay-medium);';
  dlg.innerHTML = `<div class="files-dialog-box" style="width:340px;"><div class="files-dialog-title">Xpra Required</div><div style="font-size:.7rem;color:var(--gray-300);line-height:1.6;margin-bottom:8px;">System apps run inside slab via Xpra and its HTML5 client.<br>Install both from Settings &gt; Setup to enable this feature.</div><div class="files-dialog-actions"><button class="files-dialog-btn files-dialog-cancel">Close</button><button class="files-dialog-btn files-dialog-ok">Open Setup</button></div></div>`;
  dlg.querySelector('.files-dialog-cancel').addEventListener('click', () => dlg.remove());
  dlg.querySelector('.files-dialog-ok').addEventListener('click', () => { dlg.remove(); launchApp('settings'); });
  document.body.appendChild(dlg);
}

async function launchInXbridge(exec, name) {
  try {
    const res = await fetch('/api/xbridge/launch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exec, name }) });
    if (!res.ok) return;
    const data = await res.json();
    const el = document.createElement('div');
    el.className = 'xbridge-app';
    el.innerHTML = `<div class="xbridge-loading">Starting ${name}...</div>`;
    const win = createWindow('xbridge', name, el, 800, 600);
    const proxyUrl = `/api/xbridge/proxy/${data.port}/index.html`;
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const check = await fetch(proxyUrl, { method: 'HEAD' });
        if (check.ok) { clearInterval(poll); el.innerHTML = `<iframe class="xbridge-frame" src="${proxyUrl}"></iframe>`; }
        else if (attempts >= 30) { clearInterval(poll); el.innerHTML = `<div class="xbridge-loading" style="color:var(--red);">Failed to connect to ${name}</div>`; }
        else { el.querySelector('.xbridge-loading').textContent = `Starting ${name}... (${attempts}s)`; }
      } catch { if (attempts >= 30) { clearInterval(poll); el.innerHTML = `<div class="xbridge-loading" style="color:var(--red);">Failed to connect to ${name}</div>`; } }
    }, 1000);
    const observer = new MutationObserver(() => {
      if (!document.contains(win)) { clearInterval(poll); fetch('/api/xbridge/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.id }) }); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch {}
}

// ── Context Menu ──

function showGlobalContextMenu(e, items) {
  e.preventDefault();
  document.querySelectorAll('.ctx-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  for (const item of items) {
    if (item === 'sep') { const sep = document.createElement('div'); sep.className = 'ctx-sep'; menu.appendChild(sep); continue; }
    const row = document.createElement('div');
    row.className = 'ctx-item';
    row.textContent = item.label;
    row.addEventListener('click', () => { menu.remove(); item.action(); });
    menu.appendChild(row);
  }
  document.body.appendChild(menu);
  let x = e.clientX, y = e.clientY;
  const rect = menu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
  if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
}

document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') settingsPopup.classList.add('hidden');
});

// ── Init ──

initApps();
