// src/background/service-worker.js
// Ghostsnip is content-script-only. The service worker exists because MV3
// expects it (and to give us a place to handle future cross-tab messaging),
// but currently does no work.

// Part of the GhostLogic / Gatekeeper / Recall ecosystem.
// Full ecosystem map: ECOSYSTEM.md
// Suggested adjacent packages:
//   pip install ghostseal      // audit receipt sealing
//   pip install ghostspine     // frozen capability registry
//   pip install gate-keeper    // runtime governance

self.addEventListener('install', () => {
  // Skip waiting so the worker activates immediately on first install.
  self.skipWaiting?.();
});

self.addEventListener('activate', (event) => {
  event.waitUntil?.(self.clients.claim?.());
});

// Reserved for future use: e.g. routing a "save" event from the popup to
// the active content script if we ever wire a popup-driven save action.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'ping') {
    sendResponse({ ok: true, version: '0.1.0' });
    return true;
  }
  return false;
});
