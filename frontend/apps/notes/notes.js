(function () {
  'use strict';

  const NOTES_DIR = () => HOME + '/.config/slab/data/notes/general';
  let cachedNotes = [];

  // ── API helpers ──

  async function ensureDir(path) {
    await fetch('/api/files/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  }

  async function listNotes() {
    try {
      await ensureDir(NOTES_DIR());
      const res = await fetch(`/api/files?path=${encodeURIComponent(NOTES_DIR())}`);
      const data = await res.json();
      return data.entries
        .filter(e => !e.is_dir && (e.name.endsWith('.txt') || e.name.endsWith('.json') || e.name.endsWith('.png')))
        .sort((a, b) => (b.modified || 0) - (a.modified || 0));
    } catch {
      return [];
    }
  }

  async function readNote(name) {
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(NOTES_DIR() + '/' + name)}`);
      if (!res.ok) return '';
      return await res.text();
    } catch {
      return '';
    }
  }

  async function saveNote(name, content) {
    await fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: NOTES_DIR() + '/' + name, content }),
    });
  }

  async function createNote(name) {
    await fetch('/api/files/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: NOTES_DIR() + '/' + name }),
    });
  }

  async function deleteNote(name) {
    await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [NOTES_DIR() + '/' + name] }),
    });
  }

  async function renameNote(oldName, newName) {
    await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: NOTES_DIR() + '/' + oldName, new_name: newName }),
    });
  }

  // ── Cache for tile data ──

  async function refreshCache() {
    const notes = await listNotes();
    cachedNotes = [];
    for (const n of notes.slice(0, 3)) {
      if (n.name.endsWith('.txt')) {
        const content = await readNote(n.name);
        cachedNotes.push({ name: n.name, preview: content.slice(0, 120) });
      } else {
        cachedNotes.push({ name: n.name, preview: '' });
      }
    }
  }

  refreshCache();
  setInterval(refreshCache, 10000);

  // ── Full App: Note list + editor ──

  function buildApp() {
    const el = document.createElement('div');
    el.className = 'notes-app';
    el.innerHTML = `
      <div class="notes-sidebar">
        <div class="notes-sidebar-header">
          <span class="notes-sidebar-label">Notes</span>
          <div class="notes-new-group">
            <button class="notes-new-btn" data-type="sticky" title="Sticky Note">\u2759</button>
            <button class="notes-new-btn" data-type="legal" title="Legal Pad">\u2261</button>
            <button class="notes-new-btn" data-type="sketch" title="Sketch Pad">\u270E</button>
          </div>
        </div>
        <div class="notes-list"></div>
      </div>
      <div class="notes-editor-area"></div>
    `;

    const listEl = el.querySelector('.notes-list');
    const editorArea = el.querySelector('.notes-editor-area');
    const newBtns = el.querySelectorAll('.notes-new-btn');

    let notes = [];
    let activeNote = null;
    let currentEditor = null;

    async function load() {
      notes = await listNotes();
      renderList();
      if (notes.length > 0 && !activeNote) {
        selectNote(notes[0].name);
      } else if (notes.length === 0) {
        activeNote = null;
        editorArea.innerHTML = '<div class="notes-empty">No notes yet</div>';
        currentEditor = null;
      }
    }

    function noteType(name) {
      if (name.endsWith('.json')) return 'legal';
      if (name.endsWith('.png')) return 'sketch';
      return 'sticky';
    }

    function noteLabel(name) {
      return name.replace(/\.(txt|json|png)$/, '');
    }

    function renderList() {
      listEl.innerHTML = '';
      for (const note of notes) {
        const item = document.createElement('div');
        item.className = 'notes-list-item';
        if (activeNote === note.name) item.classList.add('active');

        const type = noteType(note.name);
        const icon = type === 'legal' ? '\u2261' : type === 'sketch' ? '\u270E' : '\u2759';
        item.innerHTML = `<span class="notes-list-icon">${icon}</span><span class="notes-list-name">${noteLabel(note.name)}</span>`;

        item.addEventListener('click', () => selectNote(note.name));

        // right-click delete
        item.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (confirm('Delete "' + noteLabel(note.name) + '"?')) {
            deleteNote(note.name).then(() => {
              if (activeNote === note.name) activeNote = null;
              load();
            });
          }
        });

        listEl.appendChild(item);
      }
    }

    async function selectNote(name) {
      // save current before switching
      if (currentEditor && currentEditor.save) await currentEditor.save();
      activeNote = name;
      editorArea.innerHTML = '';

      const type = noteType(name);
      if (type === 'sticky') currentEditor = buildStickyEditor(name, editorArea);
      else if (type === 'legal') currentEditor = buildLegalEditor(name, editorArea);
      else if (type === 'sketch') currentEditor = buildSketchEditor(name, editorArea);

      renderList();
    }

    // new note buttons
    newBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.type;
        const ext = type === 'legal' ? '.json' : type === 'sketch' ? '.png' : '.txt';
        const name = 'note-' + Date.now().toString(36) + ext;
        if (type === 'legal') {
          await ensureDir(NOTES_DIR());
          await saveNote(name, JSON.stringify({ rows: [['', '']] }));
        } else if (type === 'sketch') {
          await ensureDir(NOTES_DIR());
          await createNote(name);
        } else {
          await ensureDir(NOTES_DIR());
          await createNote(name);
        }
        await load();
        selectNote(name);
      });
    });

    load();
    return el;
  }

  // ── Sticky Note Editor (plain text, no header) ──

  function buildStickyEditor(name, container) {
    const wrap = document.createElement('div');
    wrap.className = 'sticky-editor';

    const textarea = document.createElement('textarea');
    textarea.className = 'sticky-editor-textarea';
    textarea.placeholder = 'Type your note...';
    textarea.addEventListener('keydown', (e) => e.stopPropagation());
    wrap.appendChild(textarea);
    container.appendChild(wrap);

    let saveTimeout = null;

    readNote(name).then(content => { textarea.value = content; textarea.focus(); });

    textarea.addEventListener('input', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => saveNote(name, textarea.value), 600);
    });

    return {
      save: () => saveNote(name, textarea.value),
    };
  }

  // ── Legal Pad Editor (dual column table) ──

  function buildLegalEditor(name, container) {
    const wrap = document.createElement('div');
    wrap.className = 'legal-editor';
    wrap.innerHTML = `
      <div class="legal-rows"></div>
      <button class="legal-add-row">+ Add Row</button>
    `;
    const rowsEl = wrap.querySelector('.legal-rows');
    const addBtn = wrap.querySelector('.legal-add-row');
    container.appendChild(wrap);

    let rows = [['', '']];
    let saveTimeout = null;

    function schedSave() {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => saveNote(name, JSON.stringify({ rows })), 600);
    }

    function renderRows() {
      rowsEl.innerHTML = '';
      rows.forEach((row, i) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'legal-row';

        const left = document.createElement('input');
        left.className = 'legal-cell';
        left.type = 'text';
        left.value = row[0];
        left.placeholder = 'Key';
        left.spellcheck = false;
        left.addEventListener('input', () => { rows[i][0] = left.value; schedSave(); });
        left.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); right.focus(); }
          if (e.key === 'Enter') { e.preventDefault(); addRow(i + 1); }
        });

        const right = document.createElement('input');
        right.className = 'legal-cell';
        right.type = 'text';
        right.value = row[1];
        right.placeholder = 'Value';
        right.spellcheck = false;
        right.addEventListener('input', () => { rows[i][1] = right.value; schedSave(); });
        right.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); left.focus(); }
          if (e.key === 'Enter') { e.preventDefault(); addRow(i + 1); }
          if (e.key === 'Backspace' && right.value === '' && left.value === '' && rows.length > 1) {
            e.preventDefault();
            rows.splice(i, 1);
            renderRows();
            schedSave();
          }
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'legal-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.title = 'Remove row';
        removeBtn.addEventListener('click', () => {
          if (rows.length <= 1) return;
          rows.splice(i, 1);
          renderRows();
          schedSave();
        });

        rowEl.appendChild(left);
        rowEl.appendChild(right);
        rowEl.appendChild(removeBtn);
        rowsEl.appendChild(rowEl);
      });
    }

    function addRow(at) {
      rows.splice(at, 0, ['', '']);
      renderRows();
      schedSave();
      // focus the new row's left cell
      const newRow = rowsEl.children[at];
      if (newRow) newRow.querySelector('.legal-cell').focus();
    }

    addBtn.addEventListener('click', () => addRow(rows.length));

    // load existing data
    readNote(name).then(content => {
      try {
        const data = JSON.parse(content);
        if (data.rows && data.rows.length > 0) rows = data.rows;
      } catch {}
      renderRows();
    });

    return {
      save: () => saveNote(name, JSON.stringify({ rows })),
    };
  }

  // ── Sketch Pad Editor (freeform drawing) ──

  function buildSketchEditor(name, container) {
    const wrap = document.createElement('div');
    wrap.className = 'sketch-editor';
    wrap.innerHTML = `
      <div class="sketch-toolbar">
        <button class="sketch-tool active" data-tool="pen" title="Pen">\u270E</button>
        <button class="sketch-tool" data-tool="eraser" title="Eraser">\u2B1C</button>
        <div class="sketch-divider"></div>
        <button class="sketch-size active" data-size="2">S</button>
        <button class="sketch-size" data-size="5">M</button>
        <button class="sketch-size" data-size="10">L</button>
        <div class="sketch-divider"></div>
        <input class="sketch-color" type="color" value="#e63227" title="Color" />
        <div class="sketch-spacer"></div>
        <button class="sketch-clear" title="Clear">Clear</button>
      </div>
      <div class="sketch-canvas-wrap"></div>
    `;

    const canvasWrap = wrap.querySelector('.sketch-canvas-wrap');
    const toolBtns = wrap.querySelectorAll('.sketch-tool');
    const sizeBtns = wrap.querySelectorAll('.sketch-size');
    const colorInput = wrap.querySelector('.sketch-color');
    const clearBtn = wrap.querySelector('.sketch-clear');
    container.appendChild(wrap);

    const canvas = document.createElement('canvas');
    canvas.className = 'sketch-canvas';
    canvasWrap.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let tool = 'pen';
    let lineWidth = 2;
    let color = '#e63227';
    let drawing = false;
    let lastX = 0, lastY = 0;
    let saveTimeout = null;

    function resizeCanvas() {
      const rect = canvasWrap.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (canvas.width === w && canvas.height === h) return;

      // preserve content during resize
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = w;
      canvas.height = h;
      ctx.putImageData(imgData, 0, 0);
    }

    // tool selection
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tool = btn.dataset.tool;
      });
    });

    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        lineWidth = parseInt(btn.dataset.size);
      });
    });

    colorInput.addEventListener('input', () => { color = colorInput.value; });

    clearBtn.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      schedSave();
    });

    // drawing
    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      if (e.touches) {
        return [e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top];
      }
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    function startDraw(e) {
      drawing = true;
      [lastX, lastY] = getPos(e);
    }

    function draw(e) {
      if (!drawing) return;
      e.preventDefault();
      const [x, y] = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      else ctx.globalCompositeOperation = 'source-over';
      ctx.stroke();
      lastX = x;
      lastY = y;
    }

    function stopDraw() {
      if (!drawing) return;
      drawing = false;
      schedSave();
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { draw(e); }, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    function schedSave() {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(doSave, 1000);
    }

    async function doSave() {
      // save as data URL in a txt wrapper (simple, portable)
      const dataUrl = canvas.toDataURL('image/png');
      await saveNote(name, dataUrl);
    }

    // load existing drawing
    readNote(name).then(content => {
      // initial resize
      requestAnimationFrame(() => {
        resizeCanvas();
        if (content && content.startsWith('data:image')) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = content;
        }
      });
    });

    // resize observer
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(canvasWrap);

    return {
      save: doSave,
    };
  }

  // ── Spawn Elements ──

  function buildStickySpawn() {
    const el = document.createElement('div');
    el.className = 'sticky-note-spawn';

    const textarea = document.createElement('textarea');
    textarea.className = 'sticky-note-spawn-text';
    textarea.placeholder = 'Type your note...';
    textarea.addEventListener('keydown', (e) => e.stopPropagation());
    el.appendChild(textarea);

    let noteName = null;
    let saveTimeout = null;

    textarea.addEventListener('input', async () => {
      if (!noteName) {
        noteName = 'note-' + Date.now().toString(36) + '.txt';
        await ensureDir(NOTES_DIR());
        await createNote(noteName);
      }
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => saveNote(noteName, textarea.value), 600);
    });

    return el;
  }

  function buildLegalSpawn() {
    const el = document.createElement('div');
    el.className = 'legal-editor';
    el.style.height = '100%';

    const rowsEl = document.createElement('div');
    rowsEl.className = 'legal-rows';
    const addBtn = document.createElement('button');
    addBtn.className = 'legal-add-row';
    addBtn.textContent = '+ Add Row';
    el.appendChild(rowsEl);
    el.appendChild(addBtn);

    let rows = [['', '']];
    let noteName = null;
    let saveTimeout = null;

    function schedSave() {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        if (!noteName) {
          noteName = 'note-' + Date.now().toString(36) + '.json';
          await ensureDir(NOTES_DIR());
        }
        await saveNote(noteName, JSON.stringify({ rows }));
      }, 600);
    }

    function renderRows() {
      rowsEl.innerHTML = '';
      rows.forEach((row, i) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'legal-row';

        const left = document.createElement('input');
        left.className = 'legal-cell';
        left.type = 'text';
        left.value = row[0];
        left.placeholder = 'Key';
        left.spellcheck = false;
        left.addEventListener('input', () => { rows[i][0] = left.value; schedSave(); });
        left.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); right.focus(); }
          if (e.key === 'Enter') { e.preventDefault(); addRow(i + 1); }
        });

        const right = document.createElement('input');
        right.className = 'legal-cell';
        right.type = 'text';
        right.value = row[1];
        right.placeholder = 'Value';
        right.spellcheck = false;
        right.addEventListener('input', () => { rows[i][1] = right.value; schedSave(); });
        right.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); left.focus(); }
          if (e.key === 'Enter') { e.preventDefault(); addRow(i + 1); }
          if (e.key === 'Backspace' && right.value === '' && left.value === '' && rows.length > 1) {
            e.preventDefault(); rows.splice(i, 1); renderRows(); schedSave();
          }
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'legal-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', () => {
          if (rows.length <= 1) return;
          rows.splice(i, 1); renderRows(); schedSave();
        });

        rowEl.appendChild(left);
        rowEl.appendChild(right);
        rowEl.appendChild(removeBtn);
        rowsEl.appendChild(rowEl);
      });
    }

    function addRow(at) {
      rows.splice(at, 0, ['', '']);
      renderRows();
      schedSave();
      const newRow = rowsEl.children[at];
      if (newRow) newRow.querySelector('.legal-cell').focus();
    }

    addBtn.addEventListener('click', () => addRow(rows.length));
    renderRows();
    return el;
  }

  function buildSketchSpawn() {
    const el = document.createElement('div');
    el.className = 'sketch-editor';
    el.style.height = '100%';

    el.innerHTML = `
      <div class="sketch-toolbar">
        <button class="sketch-tool active" data-tool="pen" title="Pen">\u270E</button>
        <button class="sketch-tool" data-tool="eraser" title="Eraser">\u2B1C</button>
        <div class="sketch-divider"></div>
        <button class="sketch-size active" data-size="2">S</button>
        <button class="sketch-size" data-size="5">M</button>
        <button class="sketch-size" data-size="10">L</button>
        <div class="sketch-divider"></div>
        <input class="sketch-color" type="color" value="#e63227" title="Color" />
        <div class="sketch-spacer"></div>
        <button class="sketch-clear" title="Clear">Clear</button>
      </div>
      <div class="sketch-canvas-wrap"></div>
    `;

    const canvasWrap = el.querySelector('.sketch-canvas-wrap');
    const canvas = document.createElement('canvas');
    canvas.className = 'sketch-canvas';
    canvasWrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let tool = 'pen', lineWidth = 2, color = '#e63227';
    let drawing = false, lastX = 0, lastY = 0;
    let noteName = null, saveTimeout = null;

    // tool/size/color selection
    el.querySelectorAll('.sketch-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.sketch-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tool = btn.dataset.tool;
      });
    });
    el.querySelectorAll('.sketch-size').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.sketch-size').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        lineWidth = parseInt(btn.dataset.size);
      });
    });
    el.querySelector('.sketch-color').addEventListener('input', (e) => { color = e.target.value; });
    el.querySelector('.sketch-clear').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      schedSave();
    });

    function resizeCanvas() {
      const rect = canvasWrap.getBoundingClientRect();
      const w = Math.floor(rect.width), h = Math.floor(rect.height);
      if (w <= 0 || h <= 0 || (canvas.width === w && canvas.height === h)) return;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = w; canvas.height = h;
      ctx.putImageData(imgData, 0, 0);
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      if (e.touches) return [e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top];
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    function startDraw(e) { drawing = true; [lastX, lastY] = getPos(e); }
    function draw(e) {
      if (!drawing) return;
      e.preventDefault();
      const [x, y] = getPos(e);
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#000' : color;
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.stroke();
      lastX = x; lastY = y;
    }
    function stopDraw() { if (!drawing) return; drawing = false; schedSave(); }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    function schedSave() {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        if (!noteName) {
          noteName = 'sketch-' + Date.now().toString(36) + '.png';
          await ensureDir(NOTES_DIR());
        }
        await saveNote(noteName, canvas.toDataURL('image/png'));
      }, 1000);
    }

    requestAnimationFrame(() => resizeCanvas());
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(canvasWrap);

    return el;
  }

  // ── Register ──

  Slab.register('notes', {
    buildApp() {
      return buildApp();
    },

    buildElement(id) {
      if (id === 'sticky-note') return buildStickySpawn();
      if (id === 'legal-pad') return buildLegalSpawn();
      if (id === 'sketch-pad') return buildSketchSpawn();
      return null;
    },

    getData() {
      if (cachedNotes.length === 0) return null;
      return {
        value: cachedNotes.length + '',
        subtitle: cachedNotes[0]?.name.replace(/\.(txt|json|png)$/, '') || '',
        rows: cachedNotes.slice(0, 2).map(n => ({
          label: n.name.replace(/\.(txt|json|png)$/, ''),
          value: n.preview.split('\n')[0].slice(0, 40),
        })),
      };
    },
  });
})();
