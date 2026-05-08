// src/popup/popup.js
// Static popup — Ghostsnip declares zero Chrome permissions, so we don't read
// the active tab URL. The popup just tells the user how Ghostsnip works.

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

const headlineEl = document.getElementById('status-headline');
const detailEl = document.getElementById('status-detail');
const statusEl = document.getElementById('status');

statusEl.classList.add('active');
headlineEl.textContent = 'Open ChatGPT or Claude.';
detailEl.textContent = 'A "Save with Ghostsnip" button appears in the bottom-right of any conversation page. Click it to download the conversation as JSON.';
