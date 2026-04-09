(function() {
  'use strict';

  let cached = null;
  let pollTimer = null;

  function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return d + 'd ' + h + 'h';
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function formatBytes(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  function tempClass(c) {
    if (c >= 80) return 'sysmon-temp--hot';
    if (c >= 60) return 'sysmon-temp--warm';
    return '';
  }

  function buildCoresHtml(cores) {
    if (!cores || cores.length === 0) return '';
    const mid = Math.ceil(cores.length / 2);
    const col = (arr, offset) => arr.map((pct, i) => {
      const idx = i + offset;
      const danger = pct > 90 ? ' sysmon-bar--danger' : '';
      return `<div class="sysmon-core">
        <span class="sysmon-core-label">${idx}</span>
        <div class="sysmon-bar"><div class="sysmon-bar-fill${danger}" style="width:${pct}%"></div></div>
        <span class="sysmon-core-pct">${Math.round(pct)}%</span>
      </div>`;
    }).join('');
    return `<div class="sysmon-cores">
      <div class="sysmon-cores-col">${col(cores.slice(0, mid), 0)}</div>
      <div class="sysmon-cores-col">${col(cores.slice(mid), mid)}</div>
    </div>`;
  }

  function buildTempsHtml(temps) {
    if (!temps || temps.length === 0) return '';
    return temps.map(t => {
      const cls = tempClass(t.temp_c);
      return `<div class="sysmon-temp-row">
        <span class="sysmon-temp-label">${t.label}</span>
        <span class="sysmon-temp-val ${cls}">${t.temp_c}\u00b0C</span>
      </div>`;
    }).join('');
  }

  function buildDisksHtml(disks) {
    if (!disks || disks.length === 0) return '';
    return disks.map(d => {
      const danger = d.percent > 90 ? ' sysmon-bar--danger' : '';
      return `<div class="sysmon-disk">
        <div class="sysmon-disk-header">
          <span>${d.mount}</span>
          <span class="sysmon-disk-detail">${d.used_gb.toFixed(1)} / ${d.total_gb.toFixed(1)} GB</span>
        </div>
        <div class="sysmon-bar"><div class="sysmon-bar-fill${danger}" style="width:${d.percent}%"></div></div>
      </div>`;
    }).join('');
  }

  function buildNetworkHtml(net) {
    if (!net || net.length === 0) return '';
    return `<div class="sysmon-net-grid">${net.map(n =>
      `<div class="sysmon-net-card">
        <div class="sysmon-net-iface">${n.interface}</div>
        <div class="sysmon-net-row"><span>RX</span><span>${formatBytes(n.rx_bytes)}</span></div>
        <div class="sysmon-net-row"><span>TX</span><span>${formatBytes(n.tx_bytes)}</span></div>
      </div>`
    ).join('')}</div>`;
  }

  function buildSwapHtml(swap) {
    if (!swap || swap.total_mb === 0) return '';
    const danger = swap.percent > 90 ? ' sysmon-bar--danger' : '';
    return `<div class="sysmon-disk">
      <div class="sysmon-disk-header">
        <span>swap</span>
        <span class="sysmon-disk-detail">${swap.used_mb} / ${swap.total_mb} MB</span>
      </div>
      <div class="sysmon-bar"><div class="sysmon-bar-fill${danger}" style="width:${swap.percent}%"></div></div>
    </div>`;
  }

  function renderDash(el, d) {
    const cpu = d.cpu || {};
    const mem = d.memory || {};
    const cpuPct = Math.round(cpu.usage_total || 0);
    const memPct = Math.round(mem.percent || 0);

    el.innerHTML = `
      <div class="sysmon-top">
        <div class="sysmon-tile slab-tile--red">
          <div class="slab-tile-value">${cpuPct}%</div>
          <div class="sysmon-tile-sub">CPU \u2022 ${cpu.freq_mhz || 0} MHz</div>
        </div>
        <div class="sysmon-tile">
          <div class="slab-tile-value">${memPct}%</div>
          <div class="sysmon-tile-sub">${mem.used_mb || 0} / ${mem.total_mb || 0} MB</div>
        </div>
        <div class="sysmon-tile">
          <div class="slab-tile-value">${formatUptime(d.uptime || 0)}</div>
          <div class="sysmon-tile-sub">uptime</div>
        </div>
        <div class="sysmon-tile">
          <div class="slab-tile-value">${d.processes || 0}</div>
          <div class="sysmon-tile-sub">processes</div>
        </div>
      </div>
      <div class="sysmon-body">
        <div class="sysmon-col">
          <div class="sysmon-section-title">cores</div>
          ${buildCoresHtml(cpu.usage_per_core)}
          ${(d.temps && d.temps.length) ? `<div class="sysmon-section-title" style="margin-top:10px;">temperatures</div>${buildTempsHtml(d.temps)}` : ''}
        </div>
        <div class="sysmon-col">
          <div class="sysmon-section-title">disks</div>
          ${buildDisksHtml(d.disk)}
          ${buildSwapHtml(d.swap)}
          ${(d.network && d.network.length) ? `<div class="sysmon-section-title" style="margin-top:10px;">network</div>${buildNetworkHtml(d.network)}` : ''}
        </div>
      </div>
      <div class="sysmon-footer">
        <span>${d.hostname || ''}</span>
        <span>${cpu.model || ''}</span>
      </div>
    `;
  }

  function poll(dashEl) {
    fetch('/api/sysmon')
      .then(r => r.json())
      .then(d => {
        cached = d;
        if (dashEl && document.contains(dashEl)) renderDash(dashEl, d);
      })
      .catch(() => {});
  }

  function startPolling(dashEl) {
    poll(dashEl);
    pollTimer = setInterval(() => poll(dashEl), 2000);
  }

  Slab.register('sysmon', {
    buildApp() {
      const el = document.createElement('div');
      el.className = 'sysmon-app';

      const dash = document.createElement('div');
      dash.className = 'sysmon-dash';
      el.appendChild(dash);

      // Render immediately from cache if available
      if (cached) renderDash(dash, cached);

      // Start polling; stop when element is removed from DOM
      if (pollTimer) clearInterval(pollTimer);
      startPolling(dash);

      const observer = new MutationObserver(() => {
        if (!document.contains(el)) {
          clearInterval(pollTimer);
          pollTimer = null;
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      return el;
    },

    getData() {
      if (!cached) return null;
      const cpu = cached.cpu || {};
      const mem = cached.memory || {};
      const cpuPct = Math.round(cpu.usage_total || 0);
      const memPct = Math.round(mem.percent || 0);
      const freq = cpu.freq_mhz || 0;

      const rows = [];
      if (cached.load) {
        rows.push({ label: 'Load', value: cached.load.map(l => l.toFixed(2)).join('  ') });
      }
      if (cached.temps && cached.temps.length > 0) {
        rows.push({ label: 'Temp', value: cached.temps[0].temp_c + '\u00b0C' });
      }
      if (cached.uptime) {
        rows.push({ label: 'Up', value: formatUptime(cached.uptime) });
      }

      return {
        value: cpuPct + '%',
        subtitle: memPct + '% RAM \u2022 ' + freq + ' MHz',
        rows: rows,
      };
    },
  });

  // Start background polling immediately so tile data is available
  // even before the app window is opened
  setInterval(() => {
    fetch('/api/sysmon')
      .then(r => r.json())
      .then(d => { cached = d; })
      .catch(() => {});
  }, 2000);
  // Initial fetch
  fetch('/api/sysmon')
    .then(r => r.json())
    .then(d => { cached = d; })
    .catch(() => {});

})();
