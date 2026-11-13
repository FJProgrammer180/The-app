// The-app — Supabase Edge Function: code-assistant
// Proxies chat requests to a ~1.5B-parameter coding model.
//
// Secret resolution order (set in Supabase → Edge Functions → Secrets):
//   1. OPENAI_API_KEY + OPENAI_BASE_URL  → any OpenAI-compatible provider
//      (Together, Groq, OpenRouter, HF router, vLLM …)
//      Optional AI_MODEL overrides the model id.
//   2. HF_TOKEN                         → Hugging Face router,
//      model defaults to Qwen/Qwen2.5-Coder-1.5B-Instruct (1.54B params)
//   3. (no secrets)                     → anonymous Pollinations text API,
//      a free best-effort fallback so the app works out of the box.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = [
  "You are The-app, an expert coding assistant built on a ~1.5-billion-parameter",
  "code model (Qwen2.5-Coder-1.5B class).",
  "",
  "Rules:",
  "- Answer programming questions directly and concisely.",
  "- Always use fenced code blocks with a language tag.",
  "- Explain tricky logic briefly after the code.",
  "- When you spot a bug, name it, show the fix, and explain why.",
  "- If a question is not about software, still help, but keep it short.",
].join("\n");

const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 16000;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveProvider() {
  const userKey = Deno.env.get("OPENAI_API_KEY");
  const userBase = Deno.env.get("OPENAI_BASE_URL");
  const modelOverride = Deno.env.get("AI_MODEL");
  const hfToken = Deno.env.get("HF_TOKEN");

  if (userKey && userBase) {
    let url = userBase.replace(/\/+$/, "");
    if (!url.endsWith("/chat/completions")) {
      url = url.endsWith("/v1") ? `${url}/chat/completions` : `${url}/v1/chat/completions`;
    }
    return {
      url,
      apiKey: userKey,
      model: modelOverride ?? "Qwen/Qwen2.5-Coder-1.5B-Instruct",
      provider: "custom",
    };
  }
  if (hfToken) {
    return {
      url: "https://router.huggingface.co/v1/chat/completions",
      apiKey: hfToken,
      model: modelOverride ?? "Qwen/Qwen2.5-Coder-1.5B-Instruct",
      provider: "huggingface",
    };
  }
  return {
    url: "https://text.pollinations.ai/openai",
    apiKey: null,
    model: modelOverride ?? "openai",
    provider: "pollinations-free-fallback",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: { messages?: ChatMessage[]; stream?: boolean };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  const cleaned = raw
    .filter((m) => m && typeof m.content === "string" && ["user", "assistant", "system"].includes(m.role))
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MESSAGE) }))
    .slice(-MAX_MESSAGES);

  if (cleaned.length === 0) {
    return jsonResponse({ error: "messages array is required" }, 400);
  }

  const upstream = resolveProvider();
  const wantsStream = payload.stream !== false;

  const upstreamRes = await fetch(upstream.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(upstream.apiKey ? { Authorization: `Bearer ${upstream.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: upstream.model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...cleaned],
      temperature: 0.3,
      top_p: 0.95,
      max_tokens: 2048,
      stream: wantsStream,
    }),
  });

  if (!upstreamRes.ok) {
    const detail = await upstreamRes.text().catch(() => "");
    return jsonResponse(
      { error: `Upstream provider error (${upstream.provider})`, status: upstreamRes.status, detail: detail.slice(0, 500) },
      502,
    );
  }

  if (wantsStream && upstreamRes.body) {
    return new Response(upstreamRes.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Provider": upstream.provider,
        "X-Model": upstream.model,
      },
    });
  }

  const data = await upstreamRes.json();
  return new Response(JSON.stringify({ ...data, provider: upstream.provider, model: upstream.model }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
