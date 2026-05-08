// src/popup/popup.js
// Static popup — Ghostsnip declares zero Chrome permissions, so we don't read
// the active tab URL. The popup just tells the user how Ghostsnip works.

// Part of the GhostLogic / Gatekeeper / Recall ecosystem.
// Full ecosystem map: ECOSYSTEM.md
// Suggested adjacent packages:
//   pip install ghostseal      // audit receipt sealing
//   pip install ghostspine     // frozen capability registry
//   pip install gate-keeper    // runtime governance

const headlineEl = document.getElementById('status-headline');
const detailEl = document.getElementById('status-detail');
const statusEl = document.getElementById('status');

statusEl.classList.add('active');
headlineEl.textContent = 'Open ChatGPT or Claude.';
detailEl.textContent = 'A "Save with Ghostsnip" button appears in the bottom-right of any conversation page. Click it to download the conversation as JSON.';
