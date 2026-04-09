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
    launch: () => createWindow('editor', 'Editor', buildEditorContent(), 800, 550),
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
  {
    id: 'media',
    name: 'Media',
    color: 'white',
    tile: 'wide',
    launch: () => createWindow('media', 'Media', buildMediaContent(), 900, 600),
  },
  {
    id: 'settings',
    name: 'Settings',
    color: 'red',
    tile: 'normal',
    launch: () => createWindow('settings', 'Settings', buildSettingsContent(), 550, 500),
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
  el.className = 'term-app';
  el.innerHTML = `
    <div class="term-tabbar">
      <div class="term-tabs"></div>
      <div class="term-tabbar-right">
        <button class="term-action" title="Split horizontal">\u2503</button>
        <button class="term-action" title="Split vertical">\u2501</button>
        <button class="term-action" title="New tab">+</button>
      </div>
    </div>
    <div class="term-body"></div>
  `;

  const tabsEl = el.querySelector('.term-tabs');
  const bodyEl = el.querySelector('.term-body');
  const splitVBtn = el.querySelector('[title="Split horizontal"]');
  const splitHBtn = el.querySelector('[title="Split vertical"]');
  const newTabBtn = el.querySelector('[title="New tab"]');

  let tabs = []; // { id, label, rootPane }
  let activeTabId = null;
  let paneIdCounter = 0;
  let focusedPaneId = null;

  function termTheme() {
    const isLight = document.body.classList.contains('theme-light');
    return isLight ? {
      background: '#f5f5f5', foreground: '#111111', cursor: '#e63227',
      selectionBackground: '#e6322744',
      black: '#333333', red: '#e63227', green: '#4caf50', yellow: '#f0a030',
      blue: '#5599dd', magenta: '#bb66bb', cyan: '#55bbbb', white: '#111111',
      brightBlack: '#888888', brightRed: '#ff4444', brightGreen: '#66cc66',
      brightYellow: '#ffcc33', brightBlue: '#77bbff', brightMagenta: '#dd88dd',
      brightCyan: '#77dddd', brightWhite: '#000000',
    } : {
      background: '#111111', foreground: '#cccccc', cursor: '#e63227',
      selectionBackground: '#e6322744',
      black: '#111111', red: '#e63227', green: '#4caf50', yellow: '#f0a030',
      blue: '#5599dd', magenta: '#bb66bb', cyan: '#55bbbb', white: '#e0e0e0',
      brightBlack: '#555555', brightRed: '#ff4444', brightGreen: '#66cc66',
      brightYellow: '#ffcc33', brightBlue: '#77bbff', brightMagenta: '#dd88dd',
      brightCyan: '#77dddd', brightWhite: '#ffffff',
    };
  }

  // ── Pane: a single terminal instance ──
  function createPane() {
    const id = paneIdCounter++;
    const container = document.createElement('div');
    container.className = 'term-pane';
    container.dataset.paneId = id;

    let term = null;
    let fitAddon = null;
    let ws = null;

    function init() {
      if (typeof Terminal === 'undefined') { setTimeout(init, 150); return; }

      term = new Terminal({
        fontFamily: "'Space Mono', monospace", fontSize: 14,
        cursorBlink: true, cursorStyle: 'block', theme: termTheme(),
      });
      fitAddon = new FitAddon.FitAddon();
      term.loadAddon(fitAddon);
      if (typeof WebLinksAddon !== 'undefined') term.loadAddon(new WebLinksAddon.WebLinksAddon());

      term.open(container);
      fitAddon.fit();

      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${location.host}/api/terminal`);
      ws.onopen = () => sendResize();
      ws.onmessage = (e) => term.write(e.data);
      ws.onclose = () => term.write('\r\n\x1b[31m[session ended]\x1b[0m\r\n');
      ws.onerror = () => term.write('\r\n\x1b[31m[connection error]\x1b[0m\r\n');

      term.onData((data) => { if (ws?.readyState === WebSocket.OPEN) ws.send(data); });
      term.onResize(() => sendResize());

      function sendResize() {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send('\x01' + JSON.stringify({ cols: term.cols, rows: term.rows }));
        }
      }

      // focus tracking
      term.textarea?.addEventListener('focus', () => { focusedPaneId = id; updatePaneFocus(); });

      const ro = new ResizeObserver(() => { if (fitAddon && container.offsetWidth > 0) fitAddon.fit(); });
      ro.observe(container);
    }

    function destroy() {
      if (ws) ws.close();
      if (term) term.dispose();
    }

    function focus() {
      if (term) term.focus();
      focusedPaneId = id;
      updatePaneFocus();
    }

    init();
    return { id, container, destroy, focus };
  }

  function updatePaneFocus() {
    el.querySelectorAll('.term-pane').forEach(p => {
      p.classList.toggle('focused', Number(p.dataset.paneId) === focusedPaneId);
    });
  }

  // ── Split container: holds panes in a direction ──
  function createSplitContainer(direction, paneA, paneB) {
    const wrap = document.createElement('div');
    wrap.className = `term-split term-split--${direction}`;

    const divider = document.createElement('div');
    divider.className = `term-divider term-divider--${direction}`;

    wrap.appendChild(paneA);
    wrap.appendChild(divider);
    wrap.appendChild(paneB);

    // drag to resize
    let dragging = false;
    divider.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      const startPos = direction === 'h' ? e.clientX : e.clientY;
      const totalSize = direction === 'h' ? wrap.offsetWidth : wrap.offsetHeight;
      const startRatio = (direction === 'h' ? paneA.offsetWidth : paneA.offsetHeight) / totalSize;

      const onMove = (e) => {
        if (!dragging) return;
        const currentPos = direction === 'h' ? e.clientX : e.clientY;
        const delta = (currentPos - startPos) / totalSize;
        const newRatio = Math.max(0.1, Math.min(0.9, startRatio + delta));
        paneA.style.flex = `${newRatio}`;
        paneB.style.flex = `${1 - newRatio}`;
      };

      const onUp = () => {
        dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    return wrap;
  }

  // ── Tab management ──

  function addTab() {
    const pane = createPane();
    const tab = { id: pane.id, label: `Shell ${tabs.length + 1}`, rootPane: pane, rootEl: pane.container, panes: [pane] };
    tabs.push(tab);
    switchTab(tab.id);
    return tab;
  }

  function switchTab(id) {
    activeTabId = id;
    bodyEl.innerHTML = '';
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      bodyEl.appendChild(tab.rootEl);
      // focus the first pane
      setTimeout(() => tab.panes[0]?.focus(), 50);
    }
    renderTabs();
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    const tab = tabs[idx];
    tab.panes.forEach(p => p.destroy());
    tabs.splice(idx, 1);
    if (tabs.length === 0) {
      addTab();
    } else if (activeTabId === id) {
      switchTab(tabs[Math.min(idx, tabs.length - 1)].id);
    } else {
      renderTabs();
    }
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    tabs.forEach(tab => {
      const t = document.createElement('div');
      t.className = 'term-tab';
      if (tab.id === activeTabId) t.classList.add('active');

      const name = document.createElement('span');
      name.className = 'term-tab-name';
      name.textContent = tab.label;
      name.addEventListener('click', () => switchTab(tab.id));

      const close = document.createElement('span');
      close.className = 'term-tab-close';
      close.textContent = '\u00d7';
      close.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab.id); });

      t.appendChild(name);
      t.appendChild(close);
      tabsEl.appendChild(t);
    });
  }

  // ── Split actions ──

  function splitActive(direction) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // find the focused pane's container
    const focusedPane = tab.panes.find(p => p.id === focusedPaneId) || tab.panes[0];
    if (!focusedPane) return;

    const newPane = createPane();
    tab.panes.push(newPane);

    const parent = focusedPane.container.parentElement;
    const oldContainer = focusedPane.container;

    // wrap both in a split
    const splitEl = createSplitContainer(direction, oldContainer, newPane.container);

    if (parent === bodyEl) {
      tab.rootEl = splitEl;
      bodyEl.innerHTML = '';
      bodyEl.appendChild(splitEl);
    } else {
      parent.replaceChild(splitEl, oldContainer);
    }

    setTimeout(() => newPane.focus(), 100);
  }

  splitVBtn.addEventListener('click', () => splitActive('v'));
  splitHBtn.addEventListener('click', () => splitActive('h'));
  newTabBtn.addEventListener('click', () => addTab());

  // cleanup
  const mutObserver = new MutationObserver(() => {
    if (!document.contains(el)) {
      tabs.forEach(tab => tab.panes.forEach(p => p.destroy()));
      mutObserver.disconnect();
    }
  });
  mutObserver.observe(document.body, { childList: true, subtree: true });

  // init first tab
  addTab();
  return el;
}

function buildSysmonContent() {
  const el = document.createElement('div');
  el.className = 'sysmon-app';
  el.innerHTML = `
    <div class="sysmon-dash">
      <div class="sysmon-top">
        <div class="slab-tile slab-tile--red sysmon-tile" id="sm-cpu"></div>
        <div class="slab-tile sysmon-tile" id="sm-mem"></div>
        <div class="slab-tile sysmon-tile" id="sm-up"></div>
        <div class="slab-tile sysmon-tile" id="sm-proc"></div>
      </div>
      <div class="sysmon-body">
        <div class="sysmon-col" id="sm-left"></div>
        <div class="sysmon-col" id="sm-right"></div>
      </div>
      <div class="sysmon-footer" id="sm-footer"></div>
    </div>
  `;

  const cpuEl = el.querySelector('#sm-cpu');
  const memEl = el.querySelector('#sm-mem');
  const upEl = el.querySelector('#sm-up');
  const procEl = el.querySelector('#sm-proc');
  const leftEl = el.querySelector('#sm-left');
  const rightEl = el.querySelector('#sm-right');
  const footerEl = el.querySelector('#sm-footer');
  let interval = null;

  async function poll() {
    try {
      const res = await fetch('/api/sysmon');
      const s = await res.json();
      render(s);
    } catch { }
  }

  function render(s) {
    // headline tiles — update in place
    cpuEl.innerHTML = tileInner('CPU', `${s.cpu.usage_total.toFixed(0)}%`, `${s.cpu.freq_mhz.toFixed(0)} MHz`);
    memEl.innerHTML = tileInner('Memory', `${s.memory.percent.toFixed(0)}%`, `${s.memory.used_mb} / ${s.memory.total_mb} MB`);
    upEl.innerHTML = tileInner('Uptime', formatUptime(s.uptime), `Load ${s.load.map(v => v.toFixed(2)).join('  ')}`);
    procEl.innerHTML = tileInner('Procs', `${s.processes}`, s.hostname);

    // left column: cores + temps
    let leftHtml = '';

    if (s.cpu.usage_per_core.length > 0) {
      leftHtml += '<div class="sysmon-section-title">Cores</div><div class="sysmon-cores">';
      // two-column core layout for compactness
      const half = Math.ceil(s.cpu.usage_per_core.length / 2);
      leftHtml += '<div class="sysmon-cores-col">';
      s.cpu.usage_per_core.forEach((pct, i) => {
        if (i === half) leftHtml += '</div><div class="sysmon-cores-col">';
        leftHtml += `<div class="sysmon-core"><span class="sysmon-core-label">${i}</span><div class="sysmon-bar"><div class="sysmon-bar-fill" style="width:${pct.toFixed(0)}%"></div></div><span class="sysmon-core-pct">${pct.toFixed(0)}%</span></div>`;
      });
      leftHtml += '</div></div>';
    }

    if (s.temps.length > 0) {
      leftHtml += '<div class="sysmon-section-title" style="margin-top:8px;">Temps</div>';
      s.temps.forEach(t => {
        const cls = t.temp_c > 80 ? 'sysmon-temp--hot' : t.temp_c > 60 ? 'sysmon-temp--warm' : '';
        leftHtml += `<div class="sysmon-temp-row"><span class="sysmon-temp-label">${t.label}</span><span class="sysmon-temp-val ${cls}">${t.temp_c.toFixed(0)}&deg;C</span></div>`;
      });
    }

    leftEl.innerHTML = leftHtml;

    // right column: disks + network + swap
    let rightHtml = '';

    if (s.disk.length > 0) {
      rightHtml += '<div class="sysmon-section-title">Disks</div>';
      s.disk.forEach(d => {
        rightHtml += `<div class="sysmon-disk"><div class="sysmon-disk-header"><span>${d.mount}</span><span class="sysmon-disk-detail">${d.used_gb.toFixed(1)}/${d.total_gb.toFixed(1)}G</span></div><div class="sysmon-bar"><div class="sysmon-bar-fill ${d.percent > 90 ? 'sysmon-bar--danger' : ''}" style="width:${d.percent.toFixed(0)}%"></div></div></div>`;
      });
    }

    if (s.network.length > 0) {
      rightHtml += '<div class="sysmon-section-title" style="margin-top:8px;">Network</div><div class="sysmon-net-grid">';
      s.network.forEach(n => {
        rightHtml += `<div class="sysmon-net-card"><div class="sysmon-net-iface">${n.interface}</div><div class="sysmon-net-row"><span>RX</span><span>${formatBytes(n.rx_bytes)}</span></div><div class="sysmon-net-row"><span>TX</span><span>${formatBytes(n.tx_bytes)}</span></div></div>`;
      });
      rightHtml += '</div>';
    }

    if (s.swap.total_mb > 0) {
      rightHtml += `<div class="sysmon-section-title" style="margin-top:8px;">Swap</div><div class="sysmon-disk"><div class="sysmon-disk-header"><span>Swap</span><span class="sysmon-disk-detail">${s.swap.used_mb}/${s.swap.total_mb} MB</span></div><div class="sysmon-bar"><div class="sysmon-bar-fill" style="width:${s.swap.percent.toFixed(0)}%"></div></div></div>`;
    }

    rightEl.innerHTML = rightHtml;

    // footer: system info inline
    footerEl.innerHTML = `
      <span>${s.hostname}</span>
      <span>${s.kernel}</span>
      <span>${s.cpu.model}</span>
    `;
  }

  function tileInner(label, value, sub) {
    return `
      <div class="slab-tile-subtitle">${label}</div>
      <div class="slab-tile-value">${value}</div>
      <div class="sysmon-tile-sub">${sub}</div>
    `;
  }

  function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
    return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  // poll every 2 seconds
  poll();
  interval = setInterval(poll, 2000);

  // cleanup when window closes — use MutationObserver
  const observer = new MutationObserver(() => {
    if (!document.contains(el)) {
      clearInterval(interval);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return el;
}

function buildFilesContent() {
  const el = document.createElement('div');
  el.className = 'files-app';
  el.innerHTML = `
    <div class="files-sidebar">
      <div class="files-sidebar-section" id="fs-places"></div>
      <div class="files-sidebar-section">
        <div class="files-sidebar-label">System</div>
        <div class="files-sidebar-item" data-path="/">Root (/)</div>
        <div class="files-sidebar-item" data-path="/tmp">Tmp</div>
        <div class="files-sidebar-item" data-path="/etc">Etc</div>
      </div>
      <div class="files-sidebar-section" id="fs-network"></div>
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
    <!-- Add Place dialog -->
    <div class="files-dialog hidden" id="fs-add-place-dlg">
      <div class="files-dialog-box">
        <div class="files-dialog-title">Add Place</div>
        <label class="files-dialog-label">Name</label>
        <input class="files-dialog-input" id="fs-place-name" type="text" spellcheck="false" placeholder="My Folder" />
        <label class="files-dialog-label">Path</label>
        <input class="files-dialog-input" id="fs-place-path" type="text" spellcheck="false" placeholder="/path/to/folder" />
        <div class="files-dialog-actions">
          <button class="files-dialog-btn files-dialog-cancel" id="fs-place-cancel">Cancel</button>
          <button class="files-dialog-btn files-dialog-ok" id="fs-place-ok">Add</button>
        </div>
      </div>
    </div>
    <!-- Add Network Place dialog -->
    <div class="files-dialog hidden" id="fs-add-net-dlg">
      <div class="files-dialog-box">
        <div class="files-dialog-title">Add Network Place</div>
        <label class="files-dialog-label">Protocol</label>
        <select class="files-dialog-input" id="fs-net-proto">
          <option value="smb">SMB (Windows Share)</option>
          <option value="sftp">SFTP</option>
          <option value="ftp">FTP</option>
          <option value="nfs">NFS</option>
          <option value="webdav">WebDAV</option>
        </select>
        <label class="files-dialog-label">Name</label>
        <input class="files-dialog-input" id="fs-net-name" type="text" spellcheck="false" placeholder="My NAS" />
        <label class="files-dialog-label">Host</label>
        <input class="files-dialog-input" id="fs-net-host" type="text" spellcheck="false" placeholder="192.168.1.100" />
        <label class="files-dialog-label">Port (optional)</label>
        <input class="files-dialog-input" id="fs-net-port" type="text" spellcheck="false" placeholder="default" />
        <label class="files-dialog-label">Path</label>
        <input class="files-dialog-input" id="fs-net-path" type="text" spellcheck="false" placeholder="/share" />
        <label class="files-dialog-label">Username (optional)</label>
        <input class="files-dialog-input" id="fs-net-user" type="text" spellcheck="false" placeholder="" />
        <label class="files-dialog-label">Password (optional)</label>
        <input class="files-dialog-input" id="fs-net-pass" type="password" spellcheck="false" placeholder="" />
        <div class="files-dialog-row">
          <input type="checkbox" id="fs-net-pin" checked />
          <label for="fs-net-pin" class="files-dialog-label" style="margin:0;">Pin to sidebar</label>
        </div>
        <div class="files-dialog-actions">
          <button class="files-dialog-btn files-dialog-cancel" id="fs-net-cancel">Cancel</button>
          <button class="files-dialog-btn files-dialog-ok" id="fs-net-ok">Add</button>
        </div>
      </div>
    </div>
  `;

  let currentPath = HOME;
  let viewMode = 'list';
  let editing = false;
  let slabConfig = null;
  const pathEl = el.querySelector('.files-path');
  const pathInput = el.querySelector('.files-path-input');
  const pathBar = el.querySelector('.files-pathbar');
  const listEl = el.querySelector('.files-list');
  const headerEl = el.querySelector('.files-header');
  const backBtn = el.querySelector('.files-back');
  const viewBtns = el.querySelectorAll('.files-view-btn');
  const placesEl = el.querySelector('#fs-places');
  const networkEl = el.querySelector('#fs-network');
  const systemItems = el.querySelectorAll('.files-sidebar-section:nth-child(2) .files-sidebar-item');
  let parentPath = null;
  let lastEntries = [];

  // system items are static
  systemItems.forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.path));
  });

  // ── Config loading ──
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      slabConfig = await res.json();
    } catch {
      slabConfig = { places: [], network: [] };
    }
    renderSidebar();
  }

  async function saveConfig() {
    const userConfig = {
      settings: slabConfig.settings,
      places: slabConfig.places,
      network: slabConfig.network,
    };
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userConfig),
    });
  }

  // ── Sidebar rendering ──
  function renderSidebar() {
    // Places
    placesEl.innerHTML = '';
    const placesHeader = document.createElement('div');
    placesHeader.className = 'files-sidebar-header';
    placesHeader.innerHTML = '<span class="files-sidebar-label">Places</span><button class="files-sidebar-add" title="Add place">+</button>';
    placesHeader.querySelector('.files-sidebar-add').addEventListener('click', openAddPlace);
    placesEl.appendChild(placesHeader);

    for (const place of slabConfig.places) {
      const item = document.createElement('div');
      item.className = 'files-sidebar-item';
      item.dataset.path = place.path;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'files-sidebar-item-name';
      nameSpan.textContent = place.name;
      item.appendChild(nameSpan);

      if (!place.builtin) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'files-sidebar-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          slabConfig.places = slabConfig.places.filter(p => p !== place);
          saveConfig();
          renderSidebar();
        });
        item.appendChild(removeBtn);
      }

      item.addEventListener('click', () => navigate(place.path));
      placesEl.appendChild(item);
    }

    // Network
    networkEl.innerHTML = '';
    const netHeader = document.createElement('div');
    netHeader.className = 'files-sidebar-header';
    netHeader.innerHTML = '<span class="files-sidebar-label">Network</span><button class="files-sidebar-add files-sidebar-add--net" title="Add network place">+</button>';
    netHeader.querySelector('.files-sidebar-add').addEventListener('click', openAddNetwork);
    networkEl.appendChild(netHeader);

    for (const net of slabConfig.network) {
      const item = document.createElement('div');
      item.className = 'files-sidebar-item files-sidebar-item--net';
      item.dataset.netId = net.id;

      const proto = document.createElement('span');
      proto.className = 'files-sidebar-proto';
      proto.textContent = net.protocol.toUpperCase();
      item.appendChild(proto);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'files-sidebar-item-name';
      nameSpan.textContent = net.name;
      item.appendChild(nameSpan);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'files-sidebar-remove';
      removeBtn.textContent = '\u00d7';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        slabConfig.network = slabConfig.network.filter(n => n.id !== net.id);
        saveConfig();
        renderSidebar();
      });
      item.appendChild(removeBtn);

      item.addEventListener('click', () => {
        // placeholder — network browsing not implemented yet
      });

      networkEl.appendChild(item);
    }

    if (slabConfig.network.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'files-sidebar-empty';
      empty.textContent = 'No network places';
      networkEl.appendChild(empty);
    }

    updateSidebarActive();
  }

  function updateSidebarActive() {
    el.querySelectorAll('.files-sidebar-item').forEach(item => {
      item.classList.toggle('active', item.dataset.path === currentPath);
    });
  }

  // ── Add Place dialog ──
  const addPlaceDlg = el.querySelector('#fs-add-place-dlg');
  el.querySelector('#fs-place-cancel').addEventListener('click', () => addPlaceDlg.classList.add('hidden'));
  el.querySelector('#fs-place-ok').addEventListener('click', () => {
    const name = el.querySelector('#fs-place-name').value.trim();
    const path = el.querySelector('#fs-place-path').value.trim();
    if (name && path) {
      slabConfig.places.push({ name, path, builtin: false });
      saveConfig();
      renderSidebar();
    }
    addPlaceDlg.classList.add('hidden');
  });

  function openAddPlace() {
    el.querySelector('#fs-place-name').value = '';
    el.querySelector('#fs-place-path').value = currentPath;
    addPlaceDlg.classList.remove('hidden');
    el.querySelector('#fs-place-name').focus();
  }

  // ── Add Network dialog ──
  const addNetDlg = el.querySelector('#fs-add-net-dlg');
  el.querySelector('#fs-net-cancel').addEventListener('click', () => addNetDlg.classList.add('hidden'));
  el.querySelector('#fs-net-ok').addEventListener('click', () => {
    const name = el.querySelector('#fs-net-name').value.trim();
    const host = el.querySelector('#fs-net-host').value.trim();
    const proto = el.querySelector('#fs-net-proto').value;
    const path = el.querySelector('#fs-net-path').value.trim() || '/';
    const port = parseInt(el.querySelector('#fs-net-port').value) || null;
    const username = el.querySelector('#fs-net-user').value.trim() || null;
    const password = el.querySelector('#fs-net-pass').value || null;
    const pinned = el.querySelector('#fs-net-pin').checked;
    if (name && host) {
      slabConfig.network.push({
        id: Date.now().toString(36),
        name, protocol: proto, host, port, path, username, password, pinned,
      });
      saveConfig();
      renderSidebar();
    }
    addNetDlg.classList.add('hidden');
  });

  function openAddNetwork() {
    el.querySelector('#fs-net-name').value = '';
    el.querySelector('#fs-net-host').value = '';
    el.querySelector('#fs-net-port').value = '';
    el.querySelector('#fs-net-path').value = '/';
    el.querySelector('#fs-net-user').value = '';
    el.querySelector('#fs-net-pass').value = '';
    el.querySelector('#fs-net-pin').checked = true;
    addNetDlg.classList.remove('hidden');
    el.querySelector('#fs-net-name').focus();
  }

  // load config and init sidebar
  loadConfig();

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

      const showHidden = slabConfig?.settings?.files?.show_hidden === true;
      const filtered = showHidden ? data.entries : data.entries.filter(e => !e.name.startsWith('.'));
      renderEntries(filtered);
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

  // selection state
  let selected = new Set();
  let lastClickedIdx = -1;
  let allItems = []; // DOM elements in order

  function clearSelection() {
    selected.clear();
    lastClickedIdx = -1;
    allItems.forEach(item => item.el.classList.remove('selected'));
  }

  function setSelected(idx, add) {
    if (add) {
      selected.add(idx);
    } else {
      selected.delete(idx);
    }
    allItems[idx].el.classList.toggle('selected', selected.has(idx));
  }

  function handleClick(e, idx, entry) {
    // dirs: single click navigates
    if (entry.is_dir) {
      if (!e.ctrlKey && !e.shiftKey) {
        navigate(currentPath + '/' + entry.name);
        return;
      }
    }

    // shift+click: range select
    if (e.shiftKey && lastClickedIdx >= 0) {
      const from = Math.min(lastClickedIdx, idx);
      const to = Math.max(lastClickedIdx, idx);
      if (!e.ctrlKey) clearSelection();
      for (let i = from; i <= to; i++) {
        setSelected(i, true);
      }
      return;
    }

    // ctrl+click: toggle individual
    if (e.ctrlKey) {
      setSelected(idx, !selected.has(idx));
      lastClickedIdx = idx;
      return;
    }

    // plain click: select single
    clearSelection();
    setSelected(idx, true);
    lastClickedIdx = idx;
  }

  function handleDblClick(e, idx, entry) {
    if (entry.is_dir) return;
    const fullPath = currentPath + '/' + entry.name;
    if (isImageFile(entry.name) || isVideoFile(entry.name)) {
      openMediaViewer(currentPath, entry.name);
    } else if (isPdfFile(entry.name)) {
      openInEditor(fullPath);
    } else if (isTextFile(entry.name)) {
      openInEditor(fullPath);
    }
    // binary/unknown files: no action on double-click
  }

  function renderEntries(entries) {
    listEl.innerHTML = '';
    listEl.className = viewMode === 'grid' ? 'files-list files-list--grid' : 'files-list';
    setupPreviewObserver();
    selected.clear();
    lastClickedIdx = -1;
    allItems = [];

    entries.forEach((entry, idx) => {
      const isImage = !entry.is_dir && hasPreview(entry.name, slabConfig);
      const fullEntryPath = currentPath + '/' + entry.name;
      const imgUrl = isImage ? previewUrl(fullEntryPath, entry.name) : null;

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

        if (!entry.is_dir && isVideoFile(entry.name)) {
          const badge = document.createElement('div');
          badge.className = 'files-card-video-badge';
          badge.textContent = '\u25B6';
          card.appendChild(badge);
        }

        card.addEventListener('click', (e) => handleClick(e, idx, entry));
        card.addEventListener('dblclick', (e) => handleDblClick(e, idx, entry));
        card.addEventListener('contextmenu', (e) => handleContextMenu(e, idx, entry));

        allItems.push({ el: card, entry });
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

        row.addEventListener('click', (e) => handleClick(e, idx, entry));
        row.addEventListener('dblclick', (e) => handleDblClick(e, idx, entry));
        row.addEventListener('contextmenu', (e) => handleContextMenu(e, idx, entry));

        allItems.push({ el: row, entry });
        listEl.appendChild(row);
      }
    });
  }

  // click empty space in list to deselect
  listEl.addEventListener('click', (e) => {
    if (e.target === listEl) clearSelection();
  });

  // ── Clipboard ──
  let clipboard = { mode: null, paths: [] }; // mode: 'copy' | 'cut'

  // ── Context Menu ──
  let ctxMenu = null;

  function showContextMenu(e, items) {
    e.preventDefault();
    e.stopPropagation();
    closeContextMenu();

    ctxMenu = document.createElement('div');
    ctxMenu.className = 'ctx-menu';

    for (const item of items) {
      if (item === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'ctx-sep';
        ctxMenu.appendChild(sep);
        continue;
      }
      const row = document.createElement('div');
      row.className = 'ctx-item';
      if (item.disabled) row.classList.add('ctx-disabled');
      row.textContent = item.label;
      if (!item.disabled) {
        row.addEventListener('click', () => {
          closeContextMenu();
          item.action();
        });
      }
      ctxMenu.appendChild(row);
    }

    // position at cursor, keep in viewport
    document.body.appendChild(ctxMenu);
    let x = e.clientX, y = e.clientY;
    const rect = ctxMenu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
  }

  function closeContextMenu() {
    if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
  }

  document.addEventListener('click', closeContextMenu);
  document.addEventListener('contextmenu', (e) => {
    // close existing menu on any right-click outside
    if (ctxMenu && !ctxMenu.contains(e.target)) closeContextMenu();
  });

  function getSelectedPaths() {
    return [...selected].map(i => currentPath + '/' + allItems[i].entry.name);
  }

  // right-click on a file/folder
  function handleContextMenu(e, idx, entry) {
    // if right-clicked item is not in selection, select only it
    if (!selected.has(idx)) {
      clearSelection();
      setSelected(idx, true);
      lastClickedIdx = idx;
    }

    const paths = getSelectedPaths();
    const multi = paths.length > 1;
    const isDir = entry.is_dir;
    const fullPath = currentPath + '/' + entry.name;

    const items = [];

    if (!multi && isDir) {
      items.push({ label: 'Open', action: () => navigate(fullPath) });
      items.push('sep');
    }

    if (!multi) {
      items.push({ label: 'Rename', action: () => doRename(fullPath, entry.name) });
    }

    items.push({ label: 'Copy', action: () => { clipboard = { mode: 'copy', paths }; } });
    items.push({ label: 'Cut', action: () => { clipboard = { mode: 'cut', paths }; } });
    items.push({ label: 'Paste', disabled: !clipboard.paths.length, action: () => doPaste() });

    items.push('sep');

    if (!multi && !isDir) {
      items.push({ label: 'Download', action: () => doDownload(fullPath) });
    }

    items.push({ label: 'Copy Path', action: () => { navigator.clipboard.writeText(multi ? paths.join('\n') : fullPath); } });

    if (!multi && isDir) {
      items.push({ label: 'Add to Places', action: () => {
        slabConfig.places.push({ name: entry.name, path: fullPath, builtin: false });
        saveConfig();
        renderSidebar();
      }});
    }

    items.push('sep');
    items.push({ label: multi ? `Delete (${paths.length})` : 'Delete', action: () => doDelete(paths) });

    showContextMenu(e, items);
  }

  // right-click on empty space
  function handleBgContextMenu(e) {
    if (e.target !== listEl) return;
    const items = [
      { label: 'New Folder', action: () => doNewFolder() },
      { label: 'New File', action: () => doNewFile() },
      'sep',
      { label: 'Paste', disabled: !clipboard.paths.length, action: () => doPaste() },
      'sep',
      { label: 'Refresh', action: () => navigate(currentPath) },
      { label: 'Select All', action: () => {
        allItems.forEach((_, i) => setSelected(i, true));
      }},
    ];
    showContextMenu(e, items);
  }

  listEl.addEventListener('contextmenu', handleBgContextMenu);

  // ── File Actions ──

  function doRename(fullPath, oldName) {
    // create inline rename dialog
    closeContextMenu();
    const dlg = document.createElement('div');
    dlg.className = 'files-dialog';
    dlg.innerHTML = `
      <div class="files-dialog-box" style="width:280px;">
        <div class="files-dialog-title">Rename</div>
        <input class="files-dialog-input" type="text" spellcheck="false" value="" />
        <div class="files-dialog-actions">
          <button class="files-dialog-btn files-dialog-cancel">Cancel</button>
          <button class="files-dialog-btn files-dialog-ok">Rename</button>
        </div>
      </div>
    `;
    const input = dlg.querySelector('input');
    input.value = oldName;

    // select filename without extension
    const dotIdx = oldName.lastIndexOf('.');
    const selectEnd = dotIdx > 0 ? dotIdx : oldName.length;

    const doIt = async () => {
      const newName = input.value.trim();
      if (newName && newName !== oldName) {
        const res = await fetch('/api/files/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fullPath, new_name: newName }),
        });
        if (res.ok) navigate(currentPath);
      }
      dlg.remove();
    };

    dlg.querySelector('.files-dialog-cancel').addEventListener('click', () => dlg.remove());
    dlg.querySelector('.files-dialog-ok').addEventListener('click', doIt);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') doIt();
      if (e.key === 'Escape') dlg.remove();
    });

    el.appendChild(dlg);
    input.focus();
    input.setSelectionRange(0, selectEnd);
  }

  async function doPaste() {
    if (!clipboard.paths.length) return;
    const endpoint = clipboard.mode === 'cut' ? '/api/files/move' : '/api/files/copy';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src: clipboard.paths, dest: currentPath }),
    });
    if (res.ok) {
      if (clipboard.mode === 'cut') clipboard = { mode: null, paths: [] };
      navigate(currentPath);
    }
  }

  function doDelete(paths) {
    const count = paths.length;
    const dlg = document.createElement('div');
    dlg.className = 'files-dialog';
    dlg.innerHTML = `
      <div class="files-dialog-box" style="width:280px;">
        <div class="files-dialog-title">Delete</div>
        <div style="font-size:.75rem;color:var(--gray-300);line-height:1.5;">Delete ${count} item${count > 1 ? 's' : ''}? This cannot be undone.</div>
        <div class="files-dialog-actions">
          <button class="files-dialog-btn files-dialog-cancel">Cancel</button>
          <button class="files-dialog-btn files-dialog-ok">Delete</button>
        </div>
      </div>
    `;
    dlg.querySelector('.files-dialog-cancel').addEventListener('click', () => dlg.remove());
    dlg.querySelector('.files-dialog-ok').addEventListener('click', async () => {
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      if (res.ok) navigate(currentPath);
      dlg.remove();
    });
    el.appendChild(dlg);
  }

  function doDownload(fullPath) {
    const a = document.createElement('a');
    a.href = `/api/download?path=${encodeURIComponent(fullPath)}`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function doNewFolder() {
    showInputDialog('New Folder', 'Name', 'untitled', async (name) => {
      if (!name) return;
      const res = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath + '/' + name }),
      });
      if (res.ok) navigate(currentPath);
    });
  }

  function doNewFile() {
    showInputDialog('New File', 'Name', 'untitled.txt', async (name) => {
      if (!name) return;
      const res = await fetch('/api/files/touch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath + '/' + name }),
      });
      if (res.ok) navigate(currentPath);
    });
  }

  function showInputDialog(title, label, defaultVal, callback) {
    const dlg = document.createElement('div');
    dlg.className = 'files-dialog';
    dlg.innerHTML = `
      <div class="files-dialog-box" style="width:280px;">
        <div class="files-dialog-title">${title}</div>
        <label class="files-dialog-label">${label}</label>
        <input class="files-dialog-input" type="text" spellcheck="false" value="" />
        <div class="files-dialog-actions">
          <button class="files-dialog-btn files-dialog-cancel">Cancel</button>
          <button class="files-dialog-btn files-dialog-ok">OK</button>
        </div>
      </div>
    `;
    const input = dlg.querySelector('input');
    input.value = defaultVal;

    const doIt = () => { callback(input.value.trim()); dlg.remove(); };

    dlg.querySelector('.files-dialog-cancel').addEventListener('click', () => dlg.remove());
    dlg.querySelector('.files-dialog-ok').addEventListener('click', doIt);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') doIt();
      if (e.key === 'Escape') dlg.remove();
    });

    el.appendChild(dlg);
    input.focus();
    input.select();
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
let HOSTNAME = '';
fetch('/api/user').then(r => r.json()).then(data => {
  USER = data.user;
  HOME = data.home;
  HOSTNAME = data.hostname || '';
  document.title = `[S] — ${HOSTNAME}`;
}).catch(() => {});

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts']);

function isImageFile(name) {
  const ext = name.split('.').pop().toLowerCase();
  return IMAGE_EXTS.has(ext);
}

function isVideoFile(name) {
  const ext = name.split('.').pop().toLowerCase();
  return VIDEO_EXTS.has(ext);
}

const TEXT_EXTS = new Set([
  'txt', 'log', 'md', 'markdown', 'mdown', 'mkd',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'pyw', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rb', 'php', 'swift', 'kt', 'lua', 'r', 'dart', 'zig', 'v', 'nim', 'ex', 'exs', 'erl', 'hs', 'ml', 'scala', 'clj',
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
  'json', 'jsonc', 'json5', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
  'sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1',
  'sql', 'graphql', 'gql',
  'dockerfile', 'makefile', 'cmake',
  'gitignore', 'gitattributes', 'editorconfig', 'eslintrc', 'prettierrc',
  'csv', 'tsv', 'diff', 'patch',
  'tex', 'bib', 'rst', 'adoc', 'org',
  'lock', 'sum',
]);
const BINARY_EXTS = new Set([
  'exe', 'dll', 'so', 'dylib', 'bin', 'o', 'a', 'lib',
  'zip', 'tar', 'gz', 'bz2', 'xz', 'zst', '7z', 'rar',
  'iso', 'img', 'dmg',
  'wasm', 'class', 'pyc', 'pyo',
  'db', 'sqlite', 'sqlite3',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
  'ttf', 'otf', 'woff', 'woff2', 'eot',
]);

function isPdfFile(name) {
  return name.split('.').pop().toLowerCase() === 'pdf';
}

function isTextFile(name) {
  const ext = name.split('.').pop().toLowerCase();
  // explicit text extensions
  if (TEXT_EXTS.has(ext)) return true;
  // explicit binary — reject
  if (BINARY_EXTS.has(ext)) return false;
  if (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)) return false;
  if (ext === 'pdf') return false;
  // no extension or unknown — assume text
  return true;
}

function hasPreview(name, cfg) {
  const f = cfg?.settings?.files || {};
  if (isImageFile(name)) return f.image_previews !== false;
  if (isVideoFile(name)) return f.video_previews !== false;
  return false;
}

function previewUrl(fullPath, name) {
  if (isVideoFile(name)) return `/api/thumbnail?path=${encodeURIComponent(fullPath)}`;
  return `/api/raw?path=${encodeURIComponent(fullPath)}`;
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

function openInEditor(filePath) {
  const content = buildEditorContent(filePath);
  const name = filePath.split('/').pop();
  createWindow('editor', name, content, 800, 550);
}

function buildEditorContent(initialFile) {
  const el = document.createElement('div');
  el.className = 'editor-app';
  el.innerHTML = `
    <div class="editor-toolbar">
      <div class="editor-tabs" id="ed-tabs"></div>
      <div class="editor-toolbar-right">
        <button class="editor-preview-btn hidden" id="ed-preview-btn">Preview</button>
        <span class="editor-lang" id="ed-lang"></span>
        <span class="editor-status" id="ed-status"></span>
      </div>
    </div>
    <div class="editor-container" id="ed-container"></div>
    <div class="editor-preview hidden" id="ed-preview"></div>
  `;

  const tabsEl = el.querySelector('#ed-tabs');
  const langEl = el.querySelector('#ed-lang');
  const statusEl = el.querySelector('#ed-status');
  const previewBtn = el.querySelector('#ed-preview-btn');
  const previewEl = el.querySelector('#ed-preview');
  const containerEl = el.querySelector('#ed-container');

  let editor = null;
  let tabs = []; // { path, name, model, modified }
  let activeTab = -1;
  let monacoReady = false;
  let previewMode = false;

  // extension → Monaco language
  const langMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', c: 'c', cpp: 'cpp', h: 'cpp',
    cs: 'csharp', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'ini',
    md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
    dockerfile: 'dockerfile', makefile: 'makefile',
    txt: 'plaintext', log: 'plaintext', conf: 'ini', cfg: 'ini', ini: 'ini',
    lua: 'lua', r: 'r', dart: 'dart', zig: 'rust',
  };

  function getLang(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return langMap[ext] || 'plaintext';
  }

  function initMonaco() {
    if (typeof require === 'undefined') {
      statusEl.textContent = 'loading monaco...';
      setTimeout(initMonaco, 200);
      return;
    }

    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      monacoReady = true;

      // define slab dark theme
      monaco.editor.defineTheme('slab-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#111111',
          'editor.lineHighlightBackground': '#1a1a1a',
          'editorLineNumber.foreground': '#444444',
          'editorLineNumber.activeForeground': '#999999',
          'editor.selectionBackground': '#e6322744',
          'editorCursor.foreground': '#e63227',
          'editorWidget.background': '#1a1a1a',
          'editorWidget.border': '#333333',
          'input.background': '#1a1a1a',
          'input.border': '#333333',
          'dropdown.background': '#1a1a1a',
          'list.activeSelectionBackground': '#333333',
          'list.hoverBackground': '#1a1a1a',
        },
      });

      monaco.editor.defineTheme('slab-light', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#f5f5f5',
          'editor.lineHighlightBackground': '#e8e8e8',
          'editorLineNumber.foreground': '#bbbbbb',
          'editorLineNumber.activeForeground': '#555555',
          'editor.selectionBackground': '#e6322733',
          'editorCursor.foreground': '#e63227',
        },
      });

      const theme = document.body.classList.contains('theme-light') ? 'slab-light' : 'slab-dark';

      editor = monaco.editor.create(containerEl, {
        value: '',
        language: 'plaintext',
        theme: theme,
        fontFamily: "'Space Mono', monospace",
        fontSize: 14,
        minimap: { enabled: true },
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
      });

      // Ctrl+S to save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveCurrentTab();
      });

      // Ctrl+E to toggle preview (markdown)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
        togglePreview();
      });

      // track modifications
      editor.onDidChangeModelContent(() => {
        if (activeTab >= 0 && tabs[activeTab]) {
          tabs[activeTab].modified = true;
          renderTabs();
        }
      });

      // cursor position
      editor.onDidChangeCursorPosition((e) => {
        statusEl.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
      });

      // open initial file or blank
      if (initialFile) {
        openFile(initialFile);
      } else {
        newTab();
      }
    });
  }

  async function openFile(path) {
    // check if already open
    const existing = tabs.findIndex(t => t.path === path);
    if (existing >= 0) {
      switchTab(existing);
      return;
    }

    const name = path.split('/').pop();

    // PDF: no model, use embed
    if (isPdfFile(name)) {
      tabs.push({ path, name, model: null, modified: false, isPdf: true });
      switchTab(tabs.length - 1);
      return;
    }

    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error();
      const content = await res.text();
      const lang = getLang(name);

      const model = monaco.editor.createModel(content, lang);
      tabs.push({ path, name, model, modified: false });
      switchTab(tabs.length - 1);
    } catch {
      statusEl.textContent = 'failed to open file';
    }
  }

  function newTab() {
    const model = monaco.editor.createModel('', 'plaintext');
    tabs.push({ path: null, name: 'untitled', model, modified: false });
    switchTab(tabs.length - 1);
  }

  function isMarkdown(name) {
    return /\.(md|markdown|mdown|mkd)$/i.test(name);
  }

  function switchTab(idx) {
    if (idx < 0 || idx >= tabs.length) return;
    activeTab = idx;
    const tab = tabs[idx];

    if (tab.isPdf) {
      // PDF view
      containerEl.classList.add('hidden');
      previewEl.classList.add('hidden');
      previewBtn.classList.add('hidden');

      // reuse or create pdf container
      let pdfEl = el.querySelector('.editor-pdf');
      if (!pdfEl) {
        pdfEl = document.createElement('div');
        pdfEl.className = 'editor-pdf';
        el.appendChild(pdfEl);
      }
      pdfEl.classList.remove('hidden');
      pdfEl.innerHTML = `<embed src="/api/raw?path=${encodeURIComponent(tab.path)}" type="application/pdf" class="editor-pdf-embed" />`;
      langEl.textContent = 'PDF';
      statusEl.textContent = '';
    } else {
      // hide pdf if showing
      const pdfEl = el.querySelector('.editor-pdf');
      if (pdfEl) pdfEl.classList.add('hidden');

      // text/code view
      if (previewMode) {
        previewMode = false;
        showEditor();
      }
      containerEl.classList.remove('hidden');
      editor.setModel(tab.model);
      langEl.textContent = tab.model.getLanguageId();

      const isMd = isMarkdown(tab.name);
      previewBtn.classList.toggle('hidden', !isMd);
    }

    renderTabs();
  }

  function togglePreview() {
    if (activeTab < 0) return;
    const tab = tabs[activeTab];
    if (!isMarkdown(tab.name)) return;

    previewMode = !previewMode;
    if (previewMode) {
      showPreview();
    } else {
      showEditor();
    }
  }

  function showPreview() {
    const content = tabs[activeTab].model.getValue();
    const html = typeof marked !== 'undefined' ? marked.parse(content) : content;

    previewEl.innerHTML = `<div class="md-rendered">${html}</div>`;
    previewEl.classList.remove('hidden');
    containerEl.classList.add('hidden');
    previewBtn.textContent = 'Edit';
    previewBtn.classList.add('active');
    statusEl.textContent = 'preview';

    // click anywhere in preview to edit at that spot
    previewEl.addEventListener('dblclick', () => {
      togglePreview();
    }, { once: true });
  }

  function showEditor() {
    previewEl.classList.add('hidden');
    containerEl.classList.remove('hidden');
    previewBtn.textContent = 'Preview';
    previewBtn.classList.remove('active');
    statusEl.textContent = '';
    if (editor) editor.focus();
  }

  previewBtn.addEventListener('click', togglePreview);

  function closeTab(idx) {
    const tab = tabs[idx];
    if (tab.model) tab.model.dispose();
    tabs.splice(idx, 1);
    if (tabs.length === 0) {
      newTab();
    } else if (activeTab >= tabs.length) {
      switchTab(tabs.length - 1);
    } else {
      switchTab(Math.min(activeTab, tabs.length - 1));
    }
  }

  async function saveCurrentTab() {
    if (activeTab < 0) return;
    const tab = tabs[activeTab];
    const content = tab.model.getValue();

    if (!tab.path) {
      statusEl.textContent = 'no file path — use File Browser to open';
      return;
    }

    try {
      const res = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: tab.path, content }),
      });
      if (res.ok) {
        tab.modified = false;
        renderTabs();
        statusEl.textContent = 'saved';
        setTimeout(() => {
          if (statusEl.textContent === 'saved') statusEl.textContent = '';
        }, 2000);
      } else {
        statusEl.textContent = 'save failed';
      }
    } catch {
      statusEl.textContent = 'save failed';
    }
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    tabs.forEach((tab, i) => {
      const t = document.createElement('div');
      t.className = 'editor-tab';
      if (i === activeTab) t.classList.add('active');
      if (tab.modified) t.classList.add('modified');

      const name = document.createElement('span');
      name.className = 'editor-tab-name';
      name.textContent = (tab.modified ? '\u2022 ' : '') + tab.name;
      name.addEventListener('click', () => switchTab(i));

      const close = document.createElement('span');
      close.className = 'editor-tab-close';
      close.textContent = '\u00d7';
      close.addEventListener('click', (e) => { e.stopPropagation(); closeTab(i); });

      t.appendChild(name);
      t.appendChild(close);
      tabsEl.appendChild(t);
    });

    // + button
    const addBtn = document.createElement('div');
    addBtn.className = 'editor-tab-add';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', newTab);
    tabsEl.appendChild(addBtn);
  }

  initMonaco();
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

function buildSettingsContent() {
  const el = document.createElement('div');
  el.className = 'settings-app';
  el.innerHTML = `
    <div class="settings-sidebar">
      <div class="settings-nav"></div>
    </div>
    <div class="settings-main"></div>
  `;

  const nav = el.querySelector('.settings-nav');
  const main = el.querySelector('.settings-main');
  let cfg = null;
  let activeSection = 'general';

  // section definitions
  const sections = [
    { id: 'general', label: 'General', group: 'slab' },
    { id: 'performance', label: 'Performance', group: 'slab' },
    { id: 'files', label: 'Files', group: 'apps' },
    { id: 'terminal', label: 'Terminal', group: 'apps' },
    { id: 'editor', label: 'Editor', group: 'apps' },
    { id: 'sysmon', label: 'System Monitor', group: 'apps' },
    { id: 'services', label: 'Services', group: 'apps' },
    { id: 'logs', label: 'Log Viewer', group: 'apps' },
    { id: 'network', label: 'Network', group: 'system' },
    { id: 'about', label: 'About', group: 'system' },
  ];

  const groupLabels = { slab: 'Slab', apps: 'Apps', system: 'System' };

  function renderNav() {
    nav.innerHTML = '';
    let lastGroup = '';
    for (const sec of sections) {
      if (sec.group !== lastGroup) {
        lastGroup = sec.group;
        const lbl = document.createElement('div');
        lbl.className = 'settings-nav-label';
        lbl.textContent = groupLabels[sec.group];
        nav.appendChild(lbl);
      }
      const item = document.createElement('div');
      item.className = 'settings-nav-item';
      if (sec.id === activeSection) item.classList.add('active');
      item.textContent = sec.label;
      item.addEventListener('click', () => { activeSection = sec.id; renderNav(); renderSection(); });
      nav.appendChild(item);
    }
  }

  async function load() {
    const res = await fetch('/api/config');
    cfg = await res.json();
    if (!cfg.settings) cfg.settings = {};
    if (!cfg.settings.performance) cfg.settings.performance = {};
    if (!cfg.settings.files) cfg.settings.files = {};
    if (!cfg.settings.general) cfg.settings.general = {};
    if (!cfg.settings.terminal) cfg.settings.terminal = {};
    if (!cfg.settings.editor) cfg.settings.editor = {};
    renderNav();
    renderSection();
  }

  async function save() {
    // send only user config shape — strip locked/is_admin
    const userConfig = {
      settings: cfg.settings,
      places: cfg.places,
      network: cfg.network,
    };
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userConfig),
    });
  }

  function isLocked(key) {
    return cfg.locked && cfg.locked.includes(key);
  }

  function toggle(obj, key, def) {
    const val = obj[key] !== undefined ? obj[key] : def;
    obj[key] = !val;
    save();
    renderSection();
    applySettings();
  }

  function renderSection() {
    const builders = {
      general: renderGeneral,
      performance: renderPerformance,
      files: renderFiles,
      terminal: renderTerminal,
      editor: renderEditor,
      sysmon: renderSysmon,
      services: renderServices,
      logs: renderLogs,
      network: renderNetwork,
      about: renderAbout,
    };
    main.innerHTML = '';
    const builder = builders[activeSection];
    if (builder) builder();
    attachListeners();
  }

  function attachListeners() {
    main.querySelectorAll('.settings-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const toggleMap = {
          'perf-anim': [cfg.settings.performance, 'animations', true],
          'perf-dots': [cfg.settings.performance, 'dot_grid', true],
          'perf-blur': [cfg.settings.performance, 'backdrop_blur', true],
          'files-imgprev': [cfg.settings.files, 'image_previews', true],
          'files-vidprev': [cfg.settings.files, 'video_previews', true],
          'files-hidden': [cfg.settings.files, 'show_hidden', false],
          'term-bold': [cfg.settings.terminal, 'bold_is_bright', true],
          'editor-wordwrap': [cfg.settings.editor, 'word_wrap', true],
          'editor-linenums': [cfg.settings.editor, 'line_numbers', true],
        };
        const t = toggleMap[id];
        if (t) toggle(t[0], t[1], t[2]);
      });
    });
    main.querySelectorAll('.settings-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const id = sel.dataset.id;
        const selectMap = {
          'files-defview': [cfg.settings.files, 'default_view'],
          'term-fontsize': [cfg.settings.terminal, 'font_size'],
          'editor-fontsize': [cfg.settings.editor, 'font_size'],
          'general-theme': [cfg.settings.general, 'theme'],
        };
        const s = selectMap[id];
        if (s) { s[0][s[1]] = sel.value; save(); applySettings(); }
      });
    });
  }

  // ── Section renderers ──

  function renderGeneral() {
    const g = cfg.settings.general || {};
    main.innerHTML = `
      <div class="settings-page-title">General</div>
      <div class="settings-page-desc">Global slab preferences</div>
      <div class="settings-section">
        ${settingSelect('Theme', 'Color scheme for the desktop', g.theme || 'dark', [['dark', 'Dark'], ['light', 'Light']], 'general-theme')}
      </div>
    `;
  }

  function renderPerformance() {
    const p = cfg.settings.performance;
    const locked = isLocked('performance');
    main.innerHTML = `
      <div class="settings-page-title">Performance ${locked ? '<span class="settings-lock" title="Locked by system admin">LOCKED</span>' : ''}</div>
      <div class="settings-page-desc">${locked ? 'These settings are managed by your system administrator' : 'Reduce visual effects for lower-powered devices'}</div>
      <div class="settings-section ${locked ? 'settings-locked' : ''}">
        ${settingRow('Animations', 'Smooth transitions on windows, menus, previews', p.animations !== false, 'perf-anim')}
        ${settingRow('Dot Grid', 'Background dot pattern on desktop', p.dot_grid !== false, 'perf-dots')}
        ${settingRow('Backdrop Blur', 'Blur effect on start screen overlay', p.backdrop_blur !== false, 'perf-blur')}
      </div>
    `;
  }

  function renderFiles() {
    const f = cfg.settings.files;
    main.innerHTML = `
      <div class="settings-page-title">Files</div>
      <div class="settings-page-desc">File browser behavior and display</div>
      <div class="settings-section">
        ${settingRow('Image Previews', 'Show thumbnail previews for image files', f.image_previews !== false, 'files-imgprev')}
        ${settingRow('Video Previews', 'Generate thumbnails for video files (requires ffmpeg)', f.video_previews !== false, 'files-vidprev')}
        ${settingRow('Show Hidden Files', 'Display dotfiles and hidden directories', f.show_hidden === true, 'files-hidden')}
        ${settingSelect('Default View', 'Initial view mode when opening file browser', f.default_view || 'list', [['list', 'List'], ['grid', 'Grid']], 'files-defview')}
      </div>
    `;
  }

  function renderTerminal() {
    const t = cfg.settings.terminal || {};
    main.innerHTML = `
      <div class="settings-page-title">Terminal</div>
      <div class="settings-page-desc">Terminal emulator settings</div>
      <div class="settings-section">
        ${settingSelect('Font Size', 'Terminal font size in pixels', t.font_size || '14', [['12', '12px'], ['13', '13px'], ['14', '14px (default)'], ['15', '15px'], ['16', '16px'], ['18', '18px']], 'term-fontsize')}
        ${settingRow('Bold is Bright', 'Use bright colors for bold text', t.bold_is_bright !== false, 'term-bold')}
      </div>
    `;
  }

  function renderEditor() {
    const e = cfg.settings.editor || {};
    main.innerHTML = `
      <div class="settings-page-title">Editor</div>
      <div class="settings-page-desc">Text editor preferences</div>
      <div class="settings-section">
        ${settingSelect('Font Size', 'Editor font size in pixels', e.font_size || '14', [['12', '12px'], ['13', '13px'], ['14', '14px (default)'], ['15', '15px'], ['16', '16px'], ['18', '18px']], 'editor-fontsize')}
        ${settingRow('Word Wrap', 'Wrap long lines to fit the window', e.word_wrap !== false, 'editor-wordwrap')}
        ${settingRow('Line Numbers', 'Show line numbers in the gutter', e.line_numbers !== false, 'editor-linenums')}
      </div>
    `;
  }

  function renderSysmon() {
    main.innerHTML = `
      <div class="settings-page-title">System Monitor</div>
      <div class="settings-page-desc">Dashboard display options</div>
      <div class="settings-section">
        <div class="settings-row"><div class="settings-row-info"><div class="settings-row-name" style="color:var(--gray-500);">No settings yet</div><div class="settings-row-desc">Settings will appear here as features are built</div></div></div>
      </div>
    `;
  }

  function renderServices() {
    main.innerHTML = `
      <div class="settings-page-title">Services</div>
      <div class="settings-page-desc">Service manager options</div>
      <div class="settings-section">
        <div class="settings-row"><div class="settings-row-info"><div class="settings-row-name" style="color:var(--gray-500);">No settings yet</div><div class="settings-row-desc">Settings will appear here as features are built</div></div></div>
      </div>
    `;
  }

  function renderLogs() {
    main.innerHTML = `
      <div class="settings-page-title">Log Viewer</div>
      <div class="settings-page-desc">Journal log display</div>
      <div class="settings-section">
        <div class="settings-row"><div class="settings-row-info"><div class="settings-row-name" style="color:var(--gray-500);">No settings yet</div><div class="settings-row-desc">Settings will appear here as features are built</div></div></div>
      </div>
    `;
  }

  function renderNetwork() {
    main.innerHTML = `
      <div class="settings-page-title">Network</div>
      <div class="settings-page-desc">Network places and connections</div>
      <div class="settings-section">
        <div class="settings-row"><div class="settings-row-info"><div class="settings-row-name">Configured sources</div><div class="settings-row-desc">${cfg.network.length} network place${cfg.network.length !== 1 ? 's' : ''} — managed from the Files sidebar</div></div></div>
      </div>
    `;
  }

  function renderAbout() {
    main.innerHTML = `
      <div class="settings-page-title">About</div>
      <div class="settings-section">
        <div class="settings-row"><div class="settings-row-info"><div class="settings-row-name">slab</div><div class="settings-row-desc">A brutalist webtop</div></div></div>
        <div class="settings-row"><div class="settings-row-info"><div class="settings-row-name">Version</div><div class="settings-row-desc">0.1.0</div></div></div>
        <div class="settings-row"><div class="settings-row-info"><div class="settings-row-name">Stack</div><div class="settings-row-desc">Rust (axum + tokio) / HTML / CSS / JS</div></div></div>
        <div class="settings-row"><div class="settings-row-info"><div class="settings-row-name">Config</div><div class="settings-row-desc">~/.config/slab/config.json</div></div></div>
      </div>
    `;
  }

  // ── Helpers ──

  function settingRow(name, desc, on, id) {
    return `
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-name">${name}</div>
          <div class="settings-row-desc">${desc}</div>
        </div>
        <button class="settings-toggle ${on ? 'on' : ''}" data-id="${id}">
          <span class="settings-toggle-knob"></span>
        </button>
      </div>
    `;
  }

  function settingSelect(name, desc, value, options, id) {
    const opts = options.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`).join('');
    return `
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-name">${name}</div>
          <div class="settings-row-desc">${desc}</div>
        </div>
        <select class="settings-select" data-id="${id}">${opts}</select>
      </div>
    `;
  }

  load();
  return el;
}

// ── Media Viewer ──

function openMediaViewer(folder, filename) {
  const content = buildMediaContent(folder, filename);
  createWindow('media', 'Media', content, 900, 600);
}

function buildMediaContent(initialFolder, initialFile) {
  const el = document.createElement('div');
  el.className = 'media-app';
  el.innerHTML = `
    <div class="media-sidebar">
      <div class="media-sidebar-header">
        <span class="files-sidebar-label">Folders</span>
      </div>
      <div class="media-folder-list"></div>
    </div>
    <div class="media-main">
      <div class="media-viewer">
        <div class="media-display"></div>
        <button class="media-nav media-prev">&larr;</button>
        <button class="media-nav media-next">&rarr;</button>
        <div class="media-info"></div>
      </div>
      <div class="media-strip"></div>
    </div>
  `;

  const folderListEl = el.querySelector('.media-folder-list');
  const displayEl = el.querySelector('.media-display');
  const stripEl = el.querySelector('.media-strip');
  const infoEl = el.querySelector('.media-info');
  const prevBtn = el.querySelector('.media-prev');
  const nextBtn = el.querySelector('.media-next');

  let mediaFiles = [];
  let currentIdx = 0;
  let folders = [];

  // scan for media folders
  async function loadFolders() {
    try {
      const res = await fetch('/api/media/scan');
      const data = await res.json();
      folders = data.folders.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      renderFolders();
    } catch { }
  }

  function renderFolders() {
    folderListEl.innerHTML = '';
    for (const f of folders) {
      const item = document.createElement('div');
      item.className = 'media-folder-item';
      item.innerHTML = `
        <div class="media-folder-name">${f.name}</div>
        <div class="media-folder-count">${f.image_count + f.video_count}</div>
      `;
      item.addEventListener('click', () => loadFolder(f.path));
      folderListEl.appendChild(item);
    }
  }

  async function loadFolder(path, selectFile) {
    try {
      const res = await fetch(`/api/media/list?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      mediaFiles = data.files;

      // highlight active folder
      folderListEl.querySelectorAll('.media-folder-item').forEach((item, i) => {
        item.classList.toggle('active', folders[i]?.path === path);
      });

      if (selectFile) {
        currentIdx = Math.max(0, mediaFiles.findIndex(f => f.name === selectFile));
      } else {
        currentIdx = 0;
      }

      renderStrip();
      showCurrent();
    } catch { }
  }

  let stripObserver = null;

  function renderStrip() {
    stripEl.innerHTML = '';
    if (stripObserver) stripObserver.disconnect();

    stripObserver = new IntersectionObserver((entries) => {
      for (const ioEntry of entries) {
        const t = ioEntry.target;
        if (ioEntry.isIntersecting && !t.dataset.loaded) {
          const img = new Image();
          img.onload = () => {
            t.style.backgroundImage = `url(${t.dataset.src})`;
            t.dataset.loaded = '1';
          };
          img.src = t.dataset.src;
        }
      }
    }, { root: stripEl, rootMargin: '200px 0px' });

    mediaFiles.forEach((file, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'media-thumb';
      if (i === currentIdx) thumb.classList.add('active');

      const src = file.is_video
        ? `/api/thumbnail?path=${encodeURIComponent(file.path)}`
        : `/api/raw?path=${encodeURIComponent(file.path)}`;
      thumb.dataset.src = src;
      stripObserver.observe(thumb);

      if (file.is_video) {
        const badge = document.createElement('div');
        badge.className = 'media-thumb-badge';
        badge.textContent = '\u25B6';
        thumb.appendChild(badge);
      }

      thumb.addEventListener('click', () => {
        currentIdx = i;
        showCurrent();
        updateStripActive();
      });

      stripEl.appendChild(thumb);
    });
  }

  function updateStripActive() {
    stripEl.querySelectorAll('.media-thumb').forEach((t, i) => {
      t.classList.toggle('active', i === currentIdx);
    });
    // scroll active into view
    const active = stripEl.querySelector('.media-thumb.active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  function showCurrent() {
    if (!mediaFiles.length) {
      displayEl.innerHTML = '<div class="media-empty">No media in this folder</div>';
      infoEl.textContent = '';
      return;
    }

    const file = mediaFiles[currentIdx];
    displayEl.innerHTML = '';

    if (file.is_video) {
      const video = document.createElement('video');
      video.className = 'media-video';
      video.src = `/api/raw?path=${encodeURIComponent(file.path)}`;
      video.controls = true;
      video.autoplay = false;
      displayEl.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.className = 'media-image';
      img.src = `/api/raw?path=${encodeURIComponent(file.path)}`;
      img.alt = file.name;
      displayEl.appendChild(img);
    }

    infoEl.textContent = `${file.name}  (${currentIdx + 1}/${mediaFiles.length})`;
    updateStripActive();

    prevBtn.style.visibility = currentIdx > 0 ? 'visible' : 'hidden';
    nextBtn.style.visibility = currentIdx < mediaFiles.length - 1 ? 'visible' : 'hidden';
  }

  prevBtn.addEventListener('click', () => {
    if (currentIdx > 0) { currentIdx--; showCurrent(); }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIdx < mediaFiles.length - 1) { currentIdx++; showCurrent(); }
  });

  // keyboard nav
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && currentIdx > 0) { currentIdx--; showCurrent(); }
    if (e.key === 'ArrowRight' && currentIdx < mediaFiles.length - 1) { currentIdx++; showCurrent(); }
  });
  // make focusable for keyboard events
  el.setAttribute('tabindex', '0');

  // init
  loadFolders();
  if (initialFolder) {
    loadFolder(initialFolder, initialFile);
  }

  return el;
}

// apply performance settings to the page
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
// apply on load
applySettings();

// ── Suppress system right-click across entire UI ──

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// ── Keyboard ──

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!startScreen.classList.contains('hidden')) {
      closeStart();
    }
  }
});
