(function() {
  'use strict';

  // extension -> Monaco language
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

  function isPdfFile(name) {
    return name.split('.').pop().toLowerCase() === 'pdf';
  }

  function isMarkdown(name) {
    return /\.(md|markdown|mdown|mkd)$/i.test(name);
  }

  // ── Editor App ──

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
        statusEl.textContent = 'no file path \u2014 use File Browser to open';
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

  // ── Register ──

  Slab.register('editor', {
    buildApp(initialFile) {
      return buildEditorContent(initialFile);
    },
    capabilities: {
      openFileInEditor(path) {
        const content = buildEditorContent(path);
        const name = path.split('/').pop();
        Slab.createWindow('editor', name, content, 800, 550);
      },
    },
  });
})();
