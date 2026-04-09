(function() {
  'use strict';

  // ── File type detection (private to files app, exposed via capabilities) ──

  const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']);
  const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts']);
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

  function isImageFile(name) {
    const ext = name.split('.').pop().toLowerCase();
    return IMAGE_EXTS.has(ext);
  }

  function isVideoFile(name) {
    const ext = name.split('.').pop().toLowerCase();
    return VIDEO_EXTS.has(ext);
  }

  function isPdfFile(name) {
    return name.split('.').pop().toLowerCase() === 'pdf';
  }

  function isTextFile(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (TEXT_EXTS.has(ext)) return true;
    if (BINARY_EXTS.has(ext)) return false;
    if (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)) return false;
    if (ext === 'pdf') return false;
    // no extension or unknown -- assume text
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
    return icons[ext] || '\u00b7';
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

  // ── Files App ──

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
          // placeholder -- network browsing not implemented yet
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

    // editable path bar -- click to edit, enter to navigate, escape to cancel
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

    // lazy image loading -- only load when visible, fade in/out
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
        Slab.request('openMediaViewer', currentPath, entry.name);
      } else if (isPdfFile(entry.name)) {
        Slab.request('openFileInEditor', fullPath);
      } else if (isTextFile(entry.name)) {
        Slab.request('openFileInEditor', fullPath);
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

  // ── Register ──

  Slab.register('files', {
    buildApp() {
      return buildFilesContent();
    },
    capabilities: {
      isImageFile,
      isVideoFile,
      isTextFile,
      isPdfFile,
      hasPreview,
      previewUrl,
      getFileIcon,
      formatSize,
      formatDate,
    },
  });
})();
