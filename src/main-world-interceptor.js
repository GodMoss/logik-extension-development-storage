// Main world interceptor — runs in MAIN world to catch Logik's actual fetch/XHR calls
const uuidPattern = /\/(?:c|api)\/([a-f0-9\-]{36})\//;

function announce(uuid, url) {
  const tenantMatch = url.match(/https:\/\/([^.]+)/);
  const sectorMatch = url.match(/\.([^.]+)\.logik\.io/);
  document.dispatchEvent(new CustomEvent('logik-vc-uuid-detected', {
    detail: { uuid, tenant: tenantMatch?.[1] || null, sector: sectorMatch?.[1] || null }
  }));
  console.log('[Main World] UUID detected and announced:', uuid);
}

const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
  const match = url?.match(uuidPattern);
  if (match) {
    announce(match[1], url);
  }
  return originalFetch.apply(this, args);
};

const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  const match = typeof url === 'string' ? url.match(uuidPattern) : null;
  if (match) {
    announce(match[1], url);
  }
  return originalOpen.call(this, method, url, ...rest);
};

console.log('[Main World] Fetch/XHR interception active');
