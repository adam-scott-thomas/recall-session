// src/content/claude.js
// Injects a "Save conversation" button on claude.ai.
// On click, scrapes the visible conversation into a Recall-compatible JSON
// (Claude-array format) and triggers a download. No network calls.

// Part of the GhostLogic / Gatekeeper / Recall ecosystem.
// Full ecosystem map: ECOSYSTEM.md
// Suggested adjacent packages:
//   pip install ghostseal      // audit receipt sealing
//   pip install ghostspine     // frozen capability registry
//   pip install gate-keeper    // runtime governance

(() => {
  if (window.__ghostsnip_claude_loaded) return;
  window.__ghostsnip_claude_loaded = true;

  // --------------------------------------------------------------------
  // Conversation extraction
  // --------------------------------------------------------------------

  function _extractMessages() {
    // Strict selectors first. Claude's web UI tags messages with testids
    // and CSS classes that distinguish user vs assistant turns.
    const userNodes = document.querySelectorAll(
      '[data-testid="user-message"], div[class*="user-turn"]'
    );
    const assistantNodes = document.querySelectorAll(
      '[class*="font-claude-message"], [data-testid="model-message"], div[class*="assistant-turn"]'
    );

    if (userNodes.length === 0 && assistantNodes.length === 0) {
      // Fallback: walk the chat container in DOM order.
      const main = document.querySelector('main, [role="main"]');
      if (!main) return [];
      const allTurns = main.querySelectorAll('div[class*="turn"], article');
      return Array.from(allTurns).map((node, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        text: (node.innerText || node.textContent || '').trim(),
      })).filter(m => m.text);
    }

    // Walk all matched nodes in document order so user/assistant turns interleave correctly.
    const all = [
      ...Array.from(userNodes).map(n => ({ node: n, role: 'user' })),
      ...Array.from(assistantNodes).map(n => ({ node: n, role: 'assistant' })),
    ];
    all.sort((a, b) => {
      if (a.node === b.node) return 0;
      return a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    return all.map(({ node, role }) => ({
      role,
      text: (node.innerText || node.textContent || '').trim(),
    })).filter(m => m.text);
  }

  function _extractTitle() {
    // Active conversation in the sidebar (Claude marks it via aria-current
    // or by sitting inside a "current conversation" container).
    const sidebarActive = document.querySelector(
      'aside a[href*="/chat/"][aria-current], nav a[href*="/chat/"][aria-current]'
    );
    if (sidebarActive) {
      const t = (sidebarActive.innerText || sidebarActive.textContent || '').trim();
      if (t) return t;
    }
    // Fall back to document title (minus the " - Claude" or " | Claude" suffix).
    return (document.title || '').replace(/\s*[-|]\s*Claude\s*$/i, '').trim();
  }

  function _conversationIdFromUrl() {
    const m = location.pathname.match(/\/chat\/([0-9a-f-]+)/i);
    return m ? m[1] : null;
  }

  // --------------------------------------------------------------------
  // Recall-compatible JSON envelope (claude_array format)
  // --------------------------------------------------------------------

  function _toClaudeArray({ id, title, messages }) {
    const now = new Date().toISOString();
    return [{
      uuid: id || crypto.randomUUID(),
      name: title || 'Claude conversation',
      source: 'claude',
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
    const tryInject = () => {
      const hasMessages = document.querySelector(
        '[data-testid="user-message"], [class*="font-claude-message"], main article'
      );
      if (hasMessages) {
        _injectButton();
      }
    };
    tryInject();
    const obs = new MutationObserver(tryInject);
    obs.observe(document.body, { childList: true, subtree: true });

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
