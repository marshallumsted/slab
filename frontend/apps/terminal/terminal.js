(function () {
  'use strict';

  // Private pane registry — not exposed outside the IIFE
  const terminalPanes = {};

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

  function buildApp() {
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

    let tabs = []; // { id, label, rootPane, rootEl, panes }
    let activeTabId = null;
    let paneIdCounter = 0;
    let focusedPaneId = null;

    // -- Pane: a single terminal instance --

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

      function sendInput(data) {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
      }

      init();
      const pane = { id, container, destroy: () => { destroy(); delete terminalPanes[id]; }, focus, sendInput };
      terminalPanes[id] = pane;
      return pane;
    }

    function updatePaneFocus() {
      el.querySelectorAll('.term-pane').forEach(p => {
        p.classList.toggle('focused', Number(p.dataset.paneId) === focusedPaneId);
      });
    }

    // -- Split container: holds panes in a direction --

    function createSplitContainer(direction, paneA, paneB) {
      const wrap = document.createElement('div');
      wrap.className = `term-split term-split--${direction}`;

      const divider = document.createElement('div');
      divider.className = `term-divider term-divider--${direction}`;

      wrap.appendChild(paneA);
      wrap.appendChild(divider);
      wrap.appendChild(paneB);

      // drag to resize (mouse + touch)
      let dragging = false;

      function dividerStart(clientX, clientY) {
        dragging = true;
        return {
          startPos: direction === 'h' ? clientX : clientY,
          totalSize: direction === 'h' ? wrap.offsetWidth : wrap.offsetHeight,
          startRatio: (direction === 'h' ? paneA.offsetWidth : paneA.offsetHeight) /
                      (direction === 'h' ? wrap.offsetWidth : wrap.offsetHeight),
        };
      }

      function dividerMove(ctx, clientX, clientY) {
        if (!dragging) return;
        const currentPos = direction === 'h' ? clientX : clientY;
        const delta = (currentPos - ctx.startPos) / ctx.totalSize;
        const newRatio = Math.max(0.1, Math.min(0.9, ctx.startRatio + delta));
        paneA.style.flex = `${newRatio}`;
        paneB.style.flex = `${1 - newRatio}`;
      }

      divider.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const ctx = dividerStart(e.clientX, e.clientY);
        const onMove = (e) => dividerMove(ctx, e.clientX, e.clientY);
        const onUp = () => { dragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      divider.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const ctx = dividerStart(t.clientX, t.clientY);
        const onMove = (e) => { e.preventDefault(); const t = e.touches[0]; dividerMove(ctx, t.clientX, t.clientY); };
        const onEnd = () => { dragging = false; document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
      });

      return wrap;
    }

    // -- Tab management --

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

    // -- Split actions --

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

    // cleanup when removed from DOM
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

  // -- Capability: open a terminal window pre-loaded with a command --

  function openTerminalWithCommand(cmd) {
    const winId = 'terminal-cmd-' + Date.now();
    const content = buildApp();

    Slab.createWindow(winId, 'Terminal', content, 700, 450);

    // Wait for the WebSocket connection to open, then send the command
    setTimeout(() => {
      // Find the first pane that was created in this terminal instance
      const paneKeys = Object.keys(terminalPanes);
      if (paneKeys.length > 0) {
        const lastPane = terminalPanes[paneKeys[paneKeys.length - 1]];
        if (lastPane) {
          lastPane.sendInput(cmd + '\n');
        }
      }
    }, 500);
  }

  Slab.register('terminal', {
    buildApp: buildApp,
    capabilities: {
      openTerminalWithCommand: openTerminalWithCommand,
    },
  });
})();
