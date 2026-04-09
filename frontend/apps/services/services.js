(function() {
  'use strict';

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

  Slab.register('services', {
    buildApp() {
      const el = document.createElement('div');
      el.innerHTML = buildServicesContent();
      return el;
    },
    getData() {
      return null;
    },
  });
})();
