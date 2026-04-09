(function() {
  'use strict';

  function buildLogsContent() {
    return `
      <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--gray-500);line-height:1.8;">
        <div>waiting for backend...</div>
      </div>
    `;
  }

  Slab.register('logs', {
    buildApp() {
      const el = document.createElement('div');
      el.innerHTML = buildLogsContent();
      return el;
    },
    getData() {
      return null;
    },
  });
})();
