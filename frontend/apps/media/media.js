(function () {
  'use strict';

  function buildApp(initialFolder, initialFile) {
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

  Slab.register('media', {
    buildApp: buildApp,
    capabilities: {
      openMediaViewer(folder, filename) {
        const content = buildApp(folder, filename);
        Slab.createWindow('media', 'Media', content, 900, 600);
      }
    }
  });
})();
