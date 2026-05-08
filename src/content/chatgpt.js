// src/content/chatgpt.js
// Injects a "Save conversation" button on chatgpt.com and chat.openai.com.
// On click, scrapes the visible conversation into a Recall-compatible JSON
// (Claude-array format) and triggers a download. No network calls.

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

(() => {
  if (window.__ghostsnip_chatgpt_loaded) return;
  window.__ghostsnip_chatgpt_loaded = true;

  // --------------------------------------------------------------------
  // Conversation extraction
  // --------------------------------------------------------------------

  function _extractMessages() {
    // Strict selector first: the data attribute ChatGPT has used since
    // early 2024. If they rename it, the fallback covers most cases.
    const strictNodes = document.querySelectorAll('[data-message-author-role]');
    if (strictNodes.length > 0) {
      return Array.from(strictNodes).map(node => {
        const role = node.getAttribute('data-message-author-role') || 'unknown';
        // Prefer the markdown body when present; fall back to plain text.
        const body = node.querySelector('.markdown, .whitespace-pre-wrap')
          ?? node.querySelector('[data-message-id]')
          ?? node;
        const text = (body.innerText || body.textContent || '').trim();
        return { role, text };
      }).filter(m => m.text);
    }

    // Fallback: look for the conversation container by role region.
    const main = document.querySelector('main, [role="main"]');
    if (!main) return [];
    const messageNodes = main.querySelectorAll('article, [class*="conversation-turn"]');
    return Array.from(messageNodes).map((node, i) => {
      // Heuristic role: alternate user/assistant starting at user.
      const role = i % 2 === 0 ? 'user' : 'assistant';
      const text = (node.innerText || node.textContent || '').trim();
      return { role, text };
    }).filter(m => m.text);
  }

  function _extractTitle() {
    // Prefer the active conversation entry in the sidebar.
    const sidebarActive = document.querySelector('[data-active] a[href*="/c/"], aside a[href*="/c/"][aria-current]');
    if (sidebarActive) {
      const t = (sidebarActive.innerText || sidebarActive.textContent || '').trim();
      if (t) return t;
    }
    // Fall back to the document title (minus the " | ChatGPT" suffix).
    return (document.title || '').replace(/\s*\|\s*ChatGPT\s*$/i, '').trim();
  }

  function _conversationIdFromUrl() {
    const m = location.pathname.match(/\/c\/([0-9a-f-]+)/i);
    return m ? m[1] : null;
  }

  // --------------------------------------------------------------------
  // Recall-compatible JSON envelope (claude_array format)
  // --------------------------------------------------------------------

  function _toClaudeArray({ id, title, messages }) {
    const now = new Date().toISOString();
    return [{
      uuid: id || crypto.randomUUID(),
      name: title || 'ChatGPT conversation',
      source: 'chatgpt',
      captured_by: 'ghostsnip',
      captured_at: now,
      created_at: now,
      updated_at: now,
      chat_messages: messages.map(m => ({
        sender: m.role === 'assistant' ? 'assistant' : (m.role === 'user' ? 'human' : m.role),
        text: m.text,
        created_at: now,
      })),
    }];
  }

  // --------------------------------------------------------------------
  // Download trigger
  // --------------------------------------------------------------------

  function _download(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function _safeFilename(s) {
    return (s || 'conversation')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || 'conversation';
  }

  // --------------------------------------------------------------------
  // Floating button UI
  // --------------------------------------------------------------------

  const BUTTON_ID = 'ghostsnip-save-btn';
  const STATUS_ID = 'ghostsnip-status';

  function _injectButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.textContent = 'Save with Ghostsnip';
    btn.title = 'Download this conversation as JSON (works with Recall)';

    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '2147483647',
      padding: '10px 14px',
      background: '#020205',
      color: '#E8F4FF',
      border: '1px solid #3DA5FF',
      borderRadius: '8px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      boxShadow: '0 0 24px rgba(91, 200, 255, 0.35)',
      transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = '0 0 32px rgba(91, 200, 255, 0.55)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.boxShadow = '0 0 24px rgba(91, 200, 255, 0.35)';
    });

    btn.addEventListener('click', _onSaveClick);

    document.body.appendChild(btn);
  }

  function _showStatus(message, isError = false) {
    let el = document.getElementById(STATUS_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = STATUS_ID;
      Object.assign(el.style, {
        position: 'fixed',
        bottom: '60px',
        right: '20px',
        zIndex: '2147483647',
        padding: '8px 12px',
        background: '#020205',
        color: isError ? '#FF8FA8' : '#5BC8FF',
        border: `1px solid ${isError ? '#FF3D6B' : '#3DA5FF'}`,
        borderRadius: '6px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '12px',
        maxWidth: '320px',
      });
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.color = isError ? '#FF8FA8' : '#5BC8FF';
    el.style.borderColor = isError ? '#FF3D6B' : '#3DA5FF';
    setTimeout(() => el?.remove(), 4000);
  }

  function _onSaveClick() {
    try {
      const messages = _extractMessages();
      if (messages.length === 0) {
        _showStatus('No messages found. The page may have changed — please report at ghostlogic.tech/ghostsnip/issues.', true);
        return;
      }
      const title = _extractTitle();
      const id = _conversationIdFromUrl();
      const data = _toClaudeArray({ id, title, messages });
      const filename = `ghostsnip-${_safeFilename(title)}-${Date.now()}.json`;
      _download(filename, data);
      _showStatus(`Saved ${messages.length} messages.`);
    } catch (err) {
      _showStatus(`Save failed: ${err.message}`, true);
    }
  }

  // --------------------------------------------------------------------
  // Boot
  // --------------------------------------------------------------------

  function _boot() {
    // Wait until the conversation DOM is mounted before injecting the button,
    // so users don't see "no messages found" on the home / new-chat screen.
    const tryInject = () => {
      const hasMessages = document.querySelector('[data-message-author-role], main article');
      if (hasMessages) {
        _injectButton();
      }
    };
    tryInject();
    // Re-check on URL changes (SPA navigation) and DOM mutations.
    const obs = new MutationObserver(tryInject);
    obs.observe(document.body, { childList: true, subtree: true });

    // Re-inject if the user navigates between conversations.
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        document.getElementById(BUTTON_ID)?.remove();
        setTimeout(tryInject, 500);
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot, { once: true });
  } else {
    _boot();
  }
})();
