# The-app · 1.5B Coding AI

A working coding-assistant app powered by a **~1.5-billion-parameter code model**
([Qwen2.5-Coder-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct), 1.54B params, Apache-2.0),
with chat history persisted in **Supabase**.

```
Browser (this app)
   │  POST messages, stream SSE tokens
   ▼
Supabase Edge Function  ── code-assistant
   │  resolves provider (see Secrets below)
   ▼
~1.5B coding model  →  streamed back into the chat UI
```

## What works out of the box

- Chat UI with streaming responses, markdown + syntax-tagged code blocks with copy buttons
- Conversation sidebar (search, rename-by-first-message, delete)
- Persistence in your Supabase project (`ai_conversations`, `ai_messages`) — with automatic
  fallback to browser `localStorage` if Supabase is unreachable
- Dark, responsive UI (desktop + mobile)

## Files

| Path | Purpose |
|---|---|
| `index.html` / `style.css` / `app.js` | The web app (zero build step) |
| `config.js` | Supabase project URL + **publishable** key (safe for browsers) and edge-function URL |
| `supabase/schema.sql` | Idempotent DDL for the chat tables, RLS policies and trigger |
| `supabase/functions/code-assistant/index.ts` | Source of the deployed edge function |
| `assets/logo.png` | App logo / favicon |

## How the 1.5B model is served

The edge function resolves its provider in this order:

1. **`OPENAI_API_KEY` + `OPENAI_BASE_URL`** (+ optional `AI_MODEL`) — any OpenAI-compatible
   endpoint: Together, Groq, OpenRouter, Hugging Face router, your own vLLM/Ollama, …
2. **`HF_TOKEN`** — Hugging Face router with `Qwen/Qwen2.5-Coder-1.5B-Instruct`
   (the genuine 1.5B weights; get a free token at huggingface.co/settings/tokens)
3. *Neither set* — a free anonymous text API, used as a zero-config fallback.

To enable the real 1.5B weights: Supabase dashboard → **Edge Functions → Secrets** →
add `HF_TOKEN` (and optionally `AI_MODEL`). No code change or redeploy needed.

The edge function is deployed with `verify_jwt = false` so the browser can call it with the
publishable key. It only forwards chat completions — it holds no user data. If you later add
a paid API key, consider enabling JWT verification and/or tighter CORS.

## Local development

It's a static site — no build step:

```bash
python3 -m http.server 8321 --bind 0.0.0.0   # then open http://localhost:8321
```

or any static file server (nginx, `npx serve`, …).

## Notes & limitations

- The included publishable key is **public by design**; row-level security policies currently
  allow all reads/writes (fine for a personal tool — don't store secrets in chats).
  Tighten `ai_*` policies in `supabase/schema.sql` if you expose this to more users.
- A 1.5B model is small and fast, but can still be wrong — verify generated code.
- The Supabase project this app points at was restored from a paused state on 2026-11-11.
