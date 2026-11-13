/* ═══════════════════════════════════════════════════════
   The-app · 1.5B Coding AI — client logic
   Persistence : Supabase (Postgres + REST)  · fallback: localStorage
   Intelligence: Supabase Edge Function → Qwen2.5-Coder-1.5B-Instruct
   ═══════════════════════════════════════════════════════ */
"use strict";

const CFG = window.THE_APP_CONFIG || {};
const SUPABASE_URL = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_KEY = CFG.SUPABASE_PUBLISHABLE_KEY || "";
const EDGE_URL = CFG.EDGE_FUNCTION_URL || "";
const sbConfigured = SUPABASE_URL && SB_KEY && !SB_KEY.includes("REPLACE_ME");

const LS_KEYS = {
  clientId: "the_app_client_id",
  conversations: "the_app_local_conversations",
  messages: "the_app_local_messages",
};

const state = {
  clientId: getClientId(),
  conversations: [],
  currentId: null,
  messages: [],
  streaming: false,
  abort: null,
  mode: sbConfigured ? "supabase" : "local",
  codeBlocks: [],
  filter: "",
};

/* ────────────────────────── DOM helpers ────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const els = {
  sidebar: $("#sidebar"), overlay: $("#sidebarOverlay"), hamburger: $("#hamburgerBtn"),
  newChatBtn: $("#newChatBtn"), search: $("#chatSearch"), list: $("#conversationList"),
  title: $("#conversationTitle"), statusPill: $("#statusPill"), statusText: $(".status-text", $("#statusPill")),
  scroll: $("#chatScroll"), messages: $("#messages"), welcome: $("#welcomeScreen"),
  form: $("#composerForm"), input: $("#composerInput"), sendBtn: $("#sendBtn"), stopBtn: $("#stopBtn"),
  typing: $("#typingIndicator"), clearChatBtn: $("#clearChatBtn"),
  modelModal: $("#modelModal"), modelCardBtn: $("#modelCardBtn"), closeModelModal: $("#closeModelModal"),
  clearAllChatsBtn: $("#clearAllChatsBtn"), toast: $("#toast"),
};

function getClientId() {
  let id = localStorage.getItem(LS_KEYS.clientId);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
      "c-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LS_KEYS.clientId, id);
  }
  return id;
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const timeNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const timeOf = (iso) => { try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function setStatus(kind, text) {
  els.statusPill.className = "status-pill " + kind;
  els.statusText.textContent = text;
}

/* ────────────────────────── Supabase REST store ────────────────────────── */
async function sbFetch(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase ${method} ${path} → ${res.status} ${detail.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const store = {
  async listConversations() {
    if (state.mode === "supabase") {
      return sbFetch(`ai_conversations?select=*&client_id=eq.${encodeURIComponent(state.clientId)}&order=updated_at.desc`);
    }
    return JSON.parse(localStorage.getItem(LS_KEYS.conversations) || "[]")
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  },
  async createConversation(title) {
    const row = { client_id: state.clientId, title: title.slice(0, 80) || "New conversation" };
    if (state.mode === "supabase") {
      const rows = await sbFetch("ai_conversations", { method: "POST", body: row, prefer: "return=representation" });
      return rows[0];
    }
    const now = new Date().toISOString();
    const local = { id: crypto.randomUUID(), ...row, created_at: now, updated_at: now };
    const all = JSON.parse(localStorage.getItem(LS_KEYS.conversations) || "[]");
    all.push(local);
    localStorage.setItem(LS_KEYS.conversations, JSON.stringify(all));
    return local;
  },
  async patchConversation(id, patch) {
    if (state.mode === "supabase") {
      return sbFetch(`ai_conversations?id=eq.${id}`, { method: "PATCH", body: patch });
    }
    const all = JSON.parse(localStorage.getItem(LS_KEYS.conversations) || "[]");
    const i = all.findIndex((c) => c.id === id);
    if (i >= 0) { Object.assign(all[i], patch, { updated_at: new Date().toISOString() }); localStorage.setItem(LS_KEYS.conversations, JSON.stringify(all)); }
  },
  async deleteConversation(id) {
    if (state.mode === "supabase") {
      return sbFetch(`ai_conversations?id=eq.${id}`, { method: "DELETE" });
    }
    const all = JSON.parse(localStorage.getItem(LS_KEYS.conversations) || "[]").filter((c) => c.id !== id);
    localStorage.setItem(LS_KEYS.conversations, JSON.stringify(all));
    const msgs = JSON.parse(localStorage.getItem(LS_KEYS.messages) || "{}");
    delete msgs[id];
    localStorage.setItem(LS_KEYS.messages, JSON.stringify(msgs));
  },
  async clearAllConversations() {
    if (state.mode === "supabase") {
      return sbFetch(`ai_conversations?client_id=eq.${encodeURIComponent(state.clientId)}`, { method: "DELETE" });
    }
    localStorage.removeItem(LS_KEYS.conversations);
    localStorage.removeItem(LS_KEYS.messages);
  },
  async listMessages(conversationId) {
    if (state.mode === "supabase") {
      return sbFetch(`ai_messages?select=*&conversation_id=eq.${conversationId}&order=created_at.asc`);
    }
    const msgs = JSON.parse(localStorage.getItem(LS_KEYS.messages) || "{}");
    return msgs[conversationId] || [];
  },
  async insertMessage(conversationId, role, content) {
    const row = { conversation_id: conversationId, role, content };
    if (state.mode === "supabase") {
      await sbFetch("ai_messages", { method: "POST", body: row, prefer: "return=minimal" });
      await sbFetch(`ai_conversations?id=eq.${conversationId}`, { method: "PATCH", body: { updated_at: new Date().toISOString() } });
      return row;
    }
    const msgs = JSON.parse(localStorage.getItem(LS_KEYS.messages) || "{}");
    const full = { id: Date.now() + Math.random(), ...row, created_at: new Date().toISOString() };
    (msgs[conversationId] = msgs[conversationId] || []).push(full);
    localStorage.setItem(LS_KEYS.messages, JSON.stringify(msgs));
    await store.patchConversation(conversationId, {});
    return full;
  },
};

// Flip to local mode on any Supabase failure so the app keeps working.
async function withStoreFallback(fn, ...args) {
  try {
    return await fn(...args);
  } catch (err) {
    if (state.mode === "supabase") {
      console.warn("Supabase failed, switching to local mode:", err);
      state.mode = "local";
      setStatus("warn", "Local mode (Supabase offline)");
      toast("Supabase unreachable — chats are saved locally on this device");
      return storeFallbackRetry(fn, args);
    }
    throw err;
  }
}
// Retry against the local backend after flipping mode.
// (store.* methods already branch on state.mode, so re-dispatch by identity.)
async function storeFallbackRetry(fn, args) {
  const name = Object.keys(store).find((k) => store[k] === fn);
  if (name) return store[name](...args);
  throw new Error("No store fallback available");
}

/* ────────────────────────── Markdown-ish rendering ────────────────────────── */
function renderMarkdown(src) {
  let text = String(src);

  // 1) Fenced code blocks → placeholders
  text = text.replace(/```([\w+-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = state.codeBlocks.push({ lang: (lang || "text").toLowerCase(), code: code.replace(/\n+$/, "") }) - 1;
    return `\x00CODE${idx}\x00`;
  });

  // 2) Escape everything else
  text = escapeHtml(text);

  // 3) Inline formatting
  text = text.replace(/`([^`\n]+)`/g, '<code class="inline">$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  text = text.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 4) Lists (simple: consecutive - / * / 1. lines)
  text = text.replace(/(?:^|\n)((?:[-*]\s+.*(?:\n|$))+)/g, (m) => {
    const items = m.trim().split("\n").map((l) => l.replace(/^[-*]\s+/, "").trim());
    return "\n<ul>" + items.map((i) => `<li>${i}</li>`).join("") + "</ul>";
  });
  text = text.replace(/(?:^|\n)((?:\d+\.\s+.*(?:\n|$))+)/g, (m) => {
    const items = m.trim().split("\n").map((l) => l.replace(/^\d+\.\s+/, "").trim());
    return "\n<ol>" + items.map((i) => `<li>${i}</li>`).join("") + "</ol>";
  });

  // 5) Paragraphs
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const html = blocks
    .map((b) => (/^<(h\d|ul|ol|div|pre)/.test(b) ? b : `<p>${b.replace(/\n/g, "<br>")}</p>`))
    .join("\n");

  // 6) Re-insert code blocks
  return html.replace(/\x00CODE(\d+)\x00/g, (_, n) => {
    const { lang, code } = state.codeBlocks[Number(n)];
    return (
      `<div class="code-block"><div class="code-head"><span class="lang-dot"></span>` +
      `<span class="lang-name">${escapeHtml(lang)}</span>` +
      `<button class="copy-btn" data-code-idx="${n}" type="button">Copy</button></div>` +
      `<pre><code>${escapeHtml(code)}</code></pre></div>`
    );
  });
}

/* ────────────────────────── Rendering ────────────────────────── */
function renderSidebar() {
  const q = state.filter.trim().toLowerCase();
  const items = state.conversations.filter((c) => !q || (c.title || "").toLowerCase().includes(q));
  els.list.innerHTML = items.length
    ? items.map((c) => `
        <button class="conversation-item${c.id === state.currentId ? " active" : ""}" data-id="${escapeHtml(c.id)}">
          <svg class="convo-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="convo-title">${escapeHtml(c.title || "New conversation")}</span>
          <span class="convo-delete" data-delete="${escapeHtml(c.id)}" role="button" aria-label="Delete chat" tabindex="0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </span>
        </button>`).join("")
    : `<div class="convo-empty">${q ? "No chats match that search." : "No chats yet.<br>Start one above ↑"}</div>`;
}

function renderMessages() {
  els.welcome.hidden = state.messages.length > 0;
  state.codeBlocks = [];
  els.messages.innerHTML = state.messages.map(messageHtml).join("");
  scrollToBottom(false);
}

const messageHtml = (m) => `
  <article class="msg ${m.role}">
    <div class="msg-avatar">${m.role === "user" ? "YOU" : "1.5B"}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-author">${m.role === "user" ? "You" : "The-app · Qwen2.5-Coder-1.5B"}</span>
        <span class="msg-time">${m.created_at ? timeOf(m.created_at) : timeNow()}</span>
      </div>
      <div class="msg-content">${m.role === "user" ? `<p>${escapeHtml(m.content).replace(/\n/g, "<br>")}</p>` : renderMarkdown(m.content)}</div>
    </div>
  </article>`;

function appendMessageBubble(role) {
  els.welcome.hidden = true;
  state.codeBlocks = [];
  const node = document.createElement("article");
  node.className = `msg ${role}`;
  node.innerHTML = `
    <div class="msg-avatar">${role === "user" ? "YOU" : "1.5B"}</div>
    <div class="msg-body">
      <div class="msg-meta"><span class="msg-author">${role === "user" ? "You" : "The-app · Qwen2.5-Coder-1.5B"}</span><span class="msg-time">${timeNow()}</span></div>
      <div class="msg-content"></div>
    </div>`;
  els.messages.appendChild(node);
  scrollToBottom(false);
  return $(".msg-content", node);
}

function scrollToBottom(smooth = true) {
  els.scroll.scrollTo({ top: els.scroll.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

function setStreamingUI(on) {
  state.streaming = on;
  els.sendBtn.hidden = on;
  els.stopBtn.hidden = !on;
  els.input.disabled = on;
  els.typing.hidden = !on;
  setStatus(on ? "busy" : (state.mode === "supabase" ? "ok" : "warn"),
            on ? "1.5B is generating…" : (state.mode === "supabase" ? "Supabase · synced" : "Local mode"));
}

/* ────────────────────────── Conversation actions ────────────────────────── */
async function refreshConversations() {
  try {
    state.conversations = await withStoreFallback(store.listConversations);
  } catch (err) {
    console.error(err);
    state.conversations = [];
  }
  renderSidebar();
}

async function openConversation(id) {
  if (state.streaming) return;
  state.currentId = id;
  try {
    const msgs = await withStoreFallback(store.listMessages, id);
    state.messages = (msgs || []).map((m) => ({ role: m.role, content: m.content, created_at: m.created_at }));
  } catch (err) {
    console.error(err);
    state.messages = [];
    toast("Could not load this conversation");
  }
  const convo = state.conversations.find((c) => c.id === id);
  els.title.textContent = convo ? convo.title : "Conversation";
  renderMessages();
  renderSidebar();
  closeSidebarOnMobile();
}

function newConversation() {
  if (state.streaming) return;
  state.currentId = null;
  state.messages = [];
  els.title.textContent = "New conversation";
  renderMessages();
  renderSidebar();
  closeSidebarOnMobile();
  els.input.focus();
}

async function deleteConversation(id) {
  try {
    await withStoreFallback(store.deleteConversation, id);
  } catch (err) {
    console.error(err);
    toast("Delete failed — try again");
    return;
  }
  state.conversations = state.conversations.filter((c) => c.id !== id);
  if (state.currentId === id) newConversation(); else renderSidebar();
  toast("Chat deleted");
}

/* ────────────────────────── Sending + streaming ────────────────────────── */
async function sendCurrentInput() {
  const text = els.input.value.trim();
  if (!text || state.streaming) return;

  // 1) Ensure conversation exists
  if (!state.currentId) {
    try {
      const created = await withStoreFallback(store.createConversation, text.replace(/\s+/g, " ").slice(0, 60));
      state.currentId = created.id;
      state.conversations = [created, ...state.conversations];
      els.title.textContent = created.title;
      renderSidebar();
    } catch (err) {
      console.error(err);
      toast("Could not create the conversation");
      return;
    }
  }

  const convId = state.currentId;
  els.input.value = "";
  autoresize();

  // 2) User message
  state.messages.push({ role: "user", content: text, created_at: new Date().toISOString() });
  const userBubble = appendMessageBubble("user");
  userBubble.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
  withStoreFallback(store.insertMessage, convId, "user", text).catch((e) => console.error("save user msg:", e));

  // 3) Assistant placeholder
  const assistantBubble = appendMessageBubble("assistant");
  assistantBubble.innerHTML = '<p class="stream-cursor">▌</p>';

  const history = state.messages.slice(-30).map(({ role, content }) => ({ role, content }));
  setStreamingUI(true);
  state.abort = new AbortController();

  let acc = "";
  const flush = () => {
    assistantBubble.innerHTML = renderMarkdown(acc || "▌");
    scrollToBottom(false);
  };

  try {
    const res = await fetch(EDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      body: JSON.stringify({ messages: history, stream: true }),
      signal: state.abort.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.detail || `Edge function error ${res.status}`);
    }

    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("text/event-stream") && res.body) {
      acc = await readSSEStream(res.body, (delta) => { acc += delta; throttleFlush(flush); });
    } else {
      const data = await res.json();
      acc = data?.choices?.[0]?.message?.content ?? data?.output ?? "";
      if (!acc) throw new Error("Empty response from model");
      flush();
    }

    assistantBubble.innerHTML = renderMarkdown(acc || "*(no content)*");
    state.messages.push({ role: "assistant", content: acc, created_at: new Date().toISOString() });
    scrollToBottom();

    withStoreFallback(store.insertMessage, convId, "assistant", acc)
      .catch((e) => console.error("save assistant msg:", e));

    // Auto-title after the first exchange
    const userCount = state.messages.filter((m) => m.role === "user").length;
    if (userCount === 1) {
      const short = text.replace(/\s+/g, " ").slice(0, 60);
      withStoreFallback(store.patchConversation, convId, { title: short })
        .then(refreshConversations).catch(() => {});
      els.title.textContent = short;
    }
    refreshConversations();
  } catch (err) {
    if (err.name === "AbortError") {
      if (acc.trim()) {
        assistantBubble.innerHTML = renderMarkdown(acc + "\n\n*— stopped by you*");
        state.messages.push({ role: "assistant", content: acc, created_at: new Date().toISOString() });
        withStoreFallback(store.insertMessage, convId, "assistant", acc).catch(() => {});
      } else {
        assistantBubble.innerHTML = '<p class="stream-cursor">*Generation stopped.*</p>';
      }
      toast("Generation stopped");
    } else {
      console.error(err);
      assistantBubble.innerHTML =
        `<p><strong>⚠️ The 1.5B model could not respond.</strong></p>` +
        `<p class="inline">${escapeHtml(err.message || String(err))}</p>` +
        `<p>The edge function may still be waking up, or the provider is rate-limiting. Try again in a few seconds.</p>`;
      toast("Model error — see message above");
    }
  } finally {
    setStreamingUI(false);
    state.abort = null;
  }
}

function throttleFlush(fn) {
  if (throttleFlush._pending) return;
  throttleFlush._pending = true;
  requestAnimationFrame(() => { throttleFlush._pending = false; fn(); });
}

// Parse an OpenAI-style SSE stream, invoking onDelta(text) per token.
// Returns the full concatenated text.
async function readSSEStream(stream, onDelta) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "", out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content ?? "";
        if (delta) { out += delta; onDelta(delta); }
      } catch { /* non-JSON keep-alive line — ignore */ }
    }
  }
  return out;
}

/* ────────────────────────── Composer plumbing ────────────────────────── */
function autoresize() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 220) + "px";
}
function closeSidebarOnMobile() {
  els.sidebar.classList.remove("open");
  els.overlay.classList.remove("show");
}

els.form.addEventListener("submit", (e) => { e.preventDefault(); sendCurrentInput(); });
els.input.addEventListener("input", autoresize);
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCurrentInput(); }
});
els.stopBtn.addEventListener("click", () => state.abort && state.abort.abort());

els.newChatBtn.addEventListener("click", newConversation);
els.hamburger.addEventListener("click", () => {
  els.sidebar.classList.toggle("open");
  els.overlay.classList.toggle("show", els.sidebar.classList.contains("open"));
});
els.overlay.addEventListener("click", closeSidebarOnMobile);
els.search.addEventListener("input", (e) => { state.filter = e.target.value; renderSidebar(); });
els.clearChatBtn.addEventListener("click", () => { if (state.currentId) deleteConversation(state.currentId); else newConversation(); });

els.list.addEventListener("click", (e) => {
  const del = e.target.closest("[data-delete]");
  if (del) { e.stopPropagation(); deleteConversation(del.dataset.delete); return; }
  const item = e.target.closest(".conversation-item");
  if (item) openConversation(item.dataset.id);
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  const block = state.codeBlocks[Number(btn.dataset.codeIdx)];
  if (!block) return;
  const done = () => { btn.textContent = "Copied!"; setTimeout(() => (btn.textContent = "Copy"), 1600); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(block.code).then(done).catch(done);
  else { const ta = document.createElement("textarea"); ta.value = block.code; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); done(); }
});

$$(".suggestion-chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    els.input.value = chip.dataset.prompt || "";
    autoresize();
    sendCurrentInput();
  })
);

/* ─────────── Model modal ─────────── */
const openModal = () => { els.modelModal.hidden = false; document.body.style.overflow = "hidden"; };
const closeModal = () => { els.modelModal.hidden = true; document.body.style.overflow = ""; };
els.modelCardBtn.addEventListener("click", openModal);
els.closeModelModal.addEventListener("click", closeModal);
els.modelModal.addEventListener("click", (e) => { if (e.target === els.modelModal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
els.clearAllChatsBtn.addEventListener("click", async () => {
  if (!confirm("Delete ALL your conversations? This cannot be undone.")) return;
  try {
    await withStoreFallback(store.clearAllConversations);
    state.conversations = [];
    newConversation();
    closeModal();
    toast("All chats deleted");
  } catch (err) {
    console.error(err);
    toast("Could not delete chats");
  }
});

/* ────────────────────────── Boot ────────────────────────── */
(async function init() {
  autoresize();
  setStatus("warn", "Connecting…");
  try {
    state.conversations = await withStoreFallback(store.listConversations);
    setStatus(state.mode === "supabase" ? "ok" : "warn",
              state.mode === "supabase" ? "Supabase · synced" : "Local mode");
  } catch (err) {
    console.error(err);
    setStatus("warn", "Local mode");
  }
  renderSidebar();
  renderMessages();
  els.input.focus();
})();
