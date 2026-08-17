// Main world interceptor — runs in MAIN world to catch Logik's actual fetch/XHR calls
console.log('[Main World] Script starting...');

const uuidPattern = /\/(?:c|api)\/([a-f0-9\-]{36})\//;
let fetchCallCount = 0;
let xhrCallCount = 0;

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
  fetchCallCount++;
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
  if (url) {
    console.log('[Main World] Fetch call #' + fetchCallCount + ':', url.substring(Math.max(0, url.length - 80)));
    const match = url.match(uuidPattern);
    if (match) {
      console.log('[Main World] ✓ UUID pattern matched!');
      announce(match[1], url);
    }
  }
  return originalFetch.apply(this, args);
};

console.log('[Main World] About to patch XMLHttpRequest.prototype.open');
const originalOpen = XMLHttpRequest.prototype.open;
console.log('[Main World] originalOpen saved:', typeof originalOpen);

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  xhrCallCount++;
  try {
    if (typeof url === 'string') {
      console.log('[Main World] XHR call #' + xhrCallCount + ' (' + method + '):', url.substring(Math.max(0, url.length - 80)));
      const match = url.match(uuidPattern);
      if (match) {
        console.log('[Main World] ✓ UUID pattern matched!');
        announce(match[1], url);
      }
    }
  } catch (e) {
    console.error('[Main World] Error in XHR interception:', e);
  }
  return originalOpen.call(this, method, url, ...rest);
};

console.log('[Main World] XMLHttpRequest.prototype.open patched');

console.log('[Main World] Fetch/XHR interception active');
