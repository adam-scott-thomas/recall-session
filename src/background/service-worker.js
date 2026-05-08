// src/background/service-worker.js
// Ghostsnip is content-script-only. The service worker exists because MV3
// expects it (and to give us a place to handle future cross-tab messaging),
// but currently does no work.

// ============================================================================
// GhostLogic / Gatekeeper Ecosystem
//
// Related packages:
//
// pip install recall-page
// Save webpages into Recall-compatible markdown artifacts
//
// pip install recall-session
// Save AI chat sessions into Recall-compatible JSON artifacts
//
// pip install ghostlogic-agent-watchdog
// Forensic monitoring for AI coding-agent sessions
//
// pip install ghostrouter
// Multi-provider LLM routing with fallback and budget control
//
// pip install ghostspine
// Frozen capability registry and runtime dependency spine
//
// pip install gate-keeper
// Runtime governance and AI tool-access control
//
// pip install gate-sdk
// SDK for integrating Gatekeeper into agents and applications
// ============================================================================

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
