(function () {
  'use strict';

  const CATEGORY_ORDER = ['Internet', 'Development', 'Media', 'Graphics', 'Office', 'Games', 'System', 'Utilities', 'Education', 'Settings', 'Other'];

  let cachedApps = null;
  let bridgeAvailable = false;

  // ── Check bridge status ──

  async function checkBridge() {
    try {
      const res = await fetch('/api/xbridge/status');
      const data = await res.json();
      bridgeAvailable = data.available;
      return data;
    } catch {
      bridgeAvailable = false;
      return { available: false, version: '', sessions: [] };
    }
  }

  checkBridge();

  // ── Fetch installed GUI apps ──

  async function fetchApps() {
    if (cachedApps) return cachedApps;
    try {
      const res = await fetch('/api/apps');
      const data = await res.json();
      cachedApps = data.apps || [];
      return cachedApps;
    } catch {
      return [];
    }
  }

  // ── Group apps by category ──

  function groupByCategory(apps) {
    const groups = {};
    for (const app of apps) {
      const cat = app.categories[0] || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(app);
    }
    const sorted = Object.keys(groups).sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return sorted.map(cat => ({ name: cat, apps: groups[cat] }));
  }

  // ── Launch app via Xpra ──

  async function launchApp(exec, name) {
    if (!bridgeAvailable) {
      showSetupPrompt();
      return;
    }

    try {
      const res = await fetch('/api/xbridge/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exec, name }),
      });
      if (!res.ok) return;
      const data = await res.json();

      const el = document.createElement('div');
      el.className = 'xbridge-viewer';
      el.innerHTML = `<div class="xbridge-loading">Starting ${name}...</div>`;

      const win = Slab.createWindow('xbridge', name, el, 800, 600);

      const proxyUrl = `/api/xbridge/proxy/${data.port}/index.html`;
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const check = await fetch(proxyUrl, { method: 'HEAD' });
          if (check.ok) {
            clearInterval(poll);
            el.innerHTML = `<iframe class="xbridge-frame" src="${proxyUrl}"></iframe>`;
          } else if (attempts >= 30) {
            clearInterval(poll);
            el.innerHTML = `<div class="xbridge-loading xbridge-error">Failed to connect to ${name}</div>`;
          } else {
            el.querySelector('.xbridge-loading').textContent = `Starting ${name}... (${attempts}s)`;
          }
        } catch {
          if (attempts >= 30) {
            clearInterval(poll);
            el.innerHTML = `<div class="xbridge-loading xbridge-error">Failed to connect to ${name}</div>`;
          }
        }
      }, 1000);

      // cleanup on window close
      const observer = new MutationObserver(() => {
        if (!document.contains(win)) {
          clearInterval(poll);
          fetch('/api/xbridge/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.id }),
          });
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch {}
  }

  function showSetupPrompt() {
    const dlg = document.createElement('div');
    dlg.className = 'xbridge-prompt-overlay';
    dlg.innerHTML = `
      <div class="xbridge-prompt">
        <div class="xbridge-prompt-title">Xpra Required</div>
        <div class="xbridge-prompt-text">
          System apps run inside slab via Xpra and its HTML5 client.<br>
          Install both from Settings &gt; Setup to enable this feature.
        </div>
        <div class="xbridge-prompt-actions">
          <button class="xbridge-prompt-btn xbridge-prompt-cancel">Close</button>
          <button class="xbridge-prompt-btn xbridge-prompt-ok">Open Setup</button>
        </div>
      </div>
    `;
    dlg.querySelector('.xbridge-prompt-cancel').addEventListener('click', () => dlg.remove());
    dlg.querySelector('.xbridge-prompt-ok').addEventListener('click', () => {
      dlg.remove();
      Slab.request('openSettings') || (() => {
        const settingsApp = Slab._apps.settings;
        if (settingsApp) {
          const content = settingsApp.buildApp();
          Slab.createWindow('settings', 'Settings', content, 550, 500);
        }
      })();
    });
    document.body.appendChild(dlg);
  }

  // ── Full App: Categorized App Browser ──

  function buildApp() {
    const el = document.createElement('div');
    el.className = 'xbridge-app';
    el.innerHTML = `
      <div class="xbridge-header">
        <div class="xbridge-header-title">System Apps</div>
        <div class="xbridge-header-status"></div>
        <input class="xbridge-search" type="text" placeholder="Search apps..." spellcheck="false" />
      </div>
      <div class="xbridge-body"></div>
    `;

    const bodyEl = el.querySelector('.xbridge-body');
    const statusEl = el.querySelector('.xbridge-header-status');
    const searchEl = el.querySelector('.xbridge-search');
    searchEl.addEventListener('keydown', (e) => e.stopPropagation());

    async function load() {
      const [apps, bridge] = await Promise.all([fetchApps(), checkBridge()]);

      statusEl.textContent = bridge.available
        ? `Xpra ${bridge.version}`
        : 'Xpra not installed';
      statusEl.className = 'xbridge-header-status ' + (bridge.available ? 'xbridge-status-ok' : 'xbridge-status-missing');

      renderApps(apps, '');
    }

    function renderApps(apps, filter) {
      bodyEl.innerHTML = '';
      const filtered = filter
        ? apps.filter(a => a.name.toLowerCase().includes(filter) || a.comment.toLowerCase().includes(filter))
        : apps;

      if (filtered.length === 0) {
        bodyEl.innerHTML = '<div class="xbridge-empty">No apps found</div>';
        return;
      }

      const categories = groupByCategory(filtered);
      for (const cat of categories) {
        const section = document.createElement('div');
        section.className = 'xbridge-category';

        const label = document.createElement('div');
        label.className = 'xbridge-category-label';
        label.textContent = cat.name;
        section.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'xbridge-category-grid';

        for (const app of cat.apps) {
          const tile = document.createElement('div');
          tile.className = 'xbridge-app-tile';
          if (app.comment) tile.title = app.comment;

          if (app.icon) {
            const icon = document.createElement('img');
            icon.className = 'xbridge-app-icon';
            icon.src = `/api/apps/icon?name=${encodeURIComponent(app.icon)}&size=48`;
            icon.alt = '';
            icon.loading = 'lazy';
            icon.onerror = function () { this.style.display = 'none'; };
            tile.appendChild(icon);
          }

          const name = document.createElement('div');
          name.className = 'xbridge-app-name';
          name.textContent = app.name;
          tile.appendChild(name);

          tile.addEventListener('click', () => launchApp(app.exec, app.name));
          grid.appendChild(tile);
        }

        section.appendChild(grid);
        bodyEl.appendChild(section);
      }
    }

    searchEl.addEventListener('input', () => {
      const filter = searchEl.value.trim().toLowerCase();
      if (cachedApps) renderApps(cachedApps, filter);
    });

    load();
    return el;
  }

  // ── Populate tile grid with system apps ──

  async function populateTileGrid() {
    const apps = await fetchApps();
    if (apps.length === 0) return;

    const tileGrid = document.getElementById('tile-grid-inner');
    if (!tileGrid) return;

    const categories = groupByCategory(apps);
    for (const cat of categories) {
      const catLabel = document.createElement('div');
      catLabel.className = 'tile-section-label';
      catLabel.textContent = cat.name;
      tileGrid.appendChild(catLabel);

      for (const app of cat.apps) {
        const tile = document.createElement('div');
        tile.className = 'sys-app-tile';

        if (app.icon) {
          const iconEl = document.createElement('img');
          iconEl.className = 'sys-app-tile-icon';
          iconEl.src = `/api/apps/icon?name=${encodeURIComponent(app.icon)}&size=48`;
          iconEl.alt = '';
          iconEl.loading = 'lazy';
          iconEl.onerror = function () { this.style.display = 'none'; };
          tile.appendChild(iconEl);
        }

        const name = document.createElement('div');
        name.className = 'sys-app-tile-name';
        name.textContent = app.name;
        tile.appendChild(name);

        if (app.comment) tile.title = app.comment;
        tile.addEventListener('click', () => launchApp(app.exec, app.name));
        tileGrid.appendChild(tile);
      }
    }
  }

  // populate grid after registration
  populateTileGrid();

  // ── Register ──

  Slab.register('xbridge', {
    buildApp() {
      return buildApp();
    },

    getData() {
      if (!cachedApps) return null;
      return {
        value: cachedApps.length + '',
        subtitle: bridgeAvailable ? 'Xpra ready' : 'Xpra not installed',
      };
    },

    capabilities: {
      launchInXbridge(exec, name) {
        return launchApp(exec, name);
      },
    },
  });
})();
