(function () {
  'use strict';

  function buildApp() {
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
    let activeSection = 'setup';

    // section definitions
    const sections = [
      { id: 'setup', label: 'Setup', group: 'slab', highlight: true },
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
        if (sec.highlight) item.classList.add('settings-nav-highlight');
        if (sec.id === activeSection) item.classList.add('active');
        item.textContent = sec.label;
        item.addEventListener('click', () => { stopSetupPolling(); activeSection = sec.id; renderNav(); renderSection(); });
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
        setup: renderSetup,
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

    let setupPollInterval = null;
    let lastSetupHash = '';

    async function renderSetup() {
      main.innerHTML = `
        <div class="settings-page-title">Setup</div>
        <div class="settings-page-desc">System dependencies and features</div>
        <div class="settings-section"><div class="settings-row"><div class="settings-row-info"><div class="settings-row-name" style="color:var(--gray-500)">Scanning system...</div></div></div></div>
      `;

      try {
        const res = await fetch('/api/setup');
        const data = await res.json();
        lastSetupHash = setupHash(data);
        renderSetupData(data);
        startSetupPolling();
      } catch {
        main.innerHTML += '<div style="color:var(--red);padding:8px 0;">Failed to load setup status</div>';
      }
    }

    function setupHash(data) {
      return data.items.map(i => `${i.id}:${i.installed}`).join(',');
    }

    function startSetupPolling() {
      stopSetupPolling();
      setupPollInterval = setInterval(async () => {
        if (activeSection !== 'setup') { stopSetupPolling(); return; }
        try {
          const res = await fetch('/api/setup');
          const data = await res.json();
          const hash = setupHash(data);
          if (hash !== lastSetupHash) {
            lastSetupHash = hash;
            renderSetupData(data);
            // also refresh xbridge status
            fetch('/api/xbridge/status').then(r => r.json()).then(d => { xbridgeAvailable = d.available; }).catch(() => {});
          }
        } catch {}
      }, 3000);
    }

    function stopSetupPolling() {
      if (setupPollInterval) { clearInterval(setupPollInterval); setupPollInterval = null; }
    }

    function renderSetupData(data) {
      const required = data.items.filter(i => i.required);
      const optional = data.items.filter(i => !i.required);
      const installed = data.items.filter(i => i.installed);
      const missing = data.items.filter(i => !i.installed);
      const installable = missing.filter(i => !i.install_cmd.startsWith('#'));

      let html = `
        <div class="settings-page-title">Setup</div>
        <div class="settings-page-desc">${data.distro} &mdash; ${data.pkg_manager}</div>
      `;

      if (missing.length === 0) {
        html += '<div class="setup-all-good">All dependencies installed</div>';
      }

      if (installable.length > 1) {
        html += `
          <div class="setup-install-all">
            <div class="setup-install-all-info">
              <span class="setup-install-all-label">${installable.length} packages available to install</span>
            </div>
            <button class="setup-install-all-btn" id="setup-install-all">Install All Missing</button>
          </div>
        `;
      }

      // required
      const reqMissing = required.filter(i => !i.installed);
      const reqInstalled = required.filter(i => i.installed);
      if (required.length > 0) {
        html += '<div class="settings-section"><div class="sysmon-section-title">Required</div>';
        for (const item of reqMissing) html += setupItemHtml(item);
        for (const item of reqInstalled) html += setupItemHtml(item);
        html += '</div>';
      }

      // runtime deps
      const runtime = optional.filter(i => ['xpra','xpra-html5','ffmpeg','git'].includes(i.id));
      const runtimeMissing = runtime.filter(i => !i.installed);
      const runtimeInstalled = runtime.filter(i => i.installed);
      if (runtime.length > 0) {
        html += '<div class="settings-section"><div class="sysmon-section-title">Runtime Dependencies</div>';
        for (const item of runtimeMissing) html += setupItemHtml(item);
        for (const item of runtimeInstalled) html += setupItemHtml(item);
        html += '</div>';
      }

      // optional
      const extras = optional.filter(i => !['xpra','xpra-html5','ffmpeg','git'].includes(i.id));
      const extrasMissing = extras.filter(i => !i.installed);
      const extrasInstalled = extras.filter(i => i.installed);
      if (extras.length > 0) {
        html += '<div class="settings-section"><div class="sysmon-section-title">Optional</div>';
        for (const item of extrasMissing) html += setupItemHtml(item);
        for (const item of extrasInstalled) html += setupItemHtml(item);
        html += '</div>';
      }

      main.innerHTML = html;

      // install all button
      const installAllBtn = main.querySelector('#setup-install-all');
      if (installAllBtn) {
        installAllBtn.addEventListener('click', async () => {
          try {
            const res = await fetch('/api/setup/install-all');
            const result = await res.json();
            if (result.command) {
              Slab.request('openTerminalWithCommand', result.command + '\n');
            }
          } catch {}
        });
      }

      // attach button handlers
      main.querySelectorAll('.setup-install-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cmd = btn.dataset.cmd;
          Slab.request('openTerminalWithCommand', cmd);
        });
      });

      main.querySelectorAll('.setup-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.cmd);
          btn.textContent = 'Copied';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        });
      });

      main.querySelectorAll('.setup-terminal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cmd = btn.dataset.cmd;
          Slab.request('openTerminalWithCommand', cmd);
        });
      });
    }

    function setupItemHtml(item) {
      const statusClass = item.installed ? 'setup-status--ok' : 'setup-status--missing';
      const statusText = item.installed ? 'Installed' : 'Not installed';
      const version = item.version ? `<span class="setup-version">${item.version}</span>` : '';

      let actions = '';
      if (!item.installed && !item.install_cmd.startsWith('#')) {
        actions = `
          <div class="setup-actions">
            <code class="setup-cmd">${item.install_cmd}</code>
            <button class="setup-copy-btn" data-cmd="${item.install_cmd}">Copy</button>
            <button class="setup-terminal-btn" data-cmd="${item.install_cmd}">Run in Terminal</button>
          </div>
        `;
      } else if (!item.installed) {
        actions = `<div class="setup-actions"><code class="setup-cmd">${item.install_cmd}</code></div>`;
      }

      return `
        <div class="setup-item">
          <div class="setup-item-header">
            <div class="setup-item-info">
              <span class="setup-item-name">${item.name}</span>
              <span class="${statusClass}">${statusText}</span>
              ${version}
            </div>
            <div class="setup-item-desc">${item.description}</div>
          </div>
          ${actions}
        </div>
      `;
    }

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

  Slab.register('settings', {
    buildApp: buildApp
  });
})();
