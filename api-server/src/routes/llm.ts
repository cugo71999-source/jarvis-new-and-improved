/* ══════════════════════════════════════════════════════════════════════════════
   LLM Proxy — forwards browser requests to Groq (or fallback to local Ollama).
   Browser → /api/llm/v1/* → Express → Groq API (or localhost:11434)
══════════════════════════════════════════════════════════════════════════════ */
import { Router } from 'express';

const router = Router();

const GROQ_BASE   = 'https://api.groq.com/openai';
const OLLAMA_BASE = 'http://localhost:11434';

function getLLMBase(): { base: string; key: string | null } {
  const key = process.env.GROQ_API_KEY ?? null;
  if (key) return { base: GROQ_BASE, key };
  return { base: OLLAMA_BASE, key: null };
}

/* ── Chat completions ── */
router.post('/v1/chat/completions', async (req, res) => {
  const { base, key } = getLLMBase();
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const response = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(120_000),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    return res.json(data);
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    const isDown = msg.includes('ECONNREFUSED') || msg.includes('fetch');
    return res.status(503).json({
      error: {
        message: isDown
          ? key
            ? 'Could not reach Groq API — check your GROQ_API_KEY and network.'
            : 'Ollama is not running. Start it with: ollama serve'
          : msg,
        type: 'llm_error',
      },
    });
  }
});

/* ── List models ── */
router.get('/v1/models', async (_req, res) => {
  const { base, key } = getLLMBase();
  try {
    const headers: Record<string, string> = {};
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const url = key ? `${base}/v1/models` : `${OLLAMA_BASE}/api/tags`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });

    if (!response.ok) return res.status(503).json({ object: 'list', data: [] });

    const data: any = await response.json();

    if (key) {
      /* Groq returns OpenAI-compatible format already */
      return res.json(data);
    }

    /* Ollama format → OpenAI format */
    const models = (data.models ?? []).map((m: any) => ({
      id: m.name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'ollama',
    }));
    return res.json({ object: 'list', data: models });
  } catch {
    return res.status(503).json({ object: 'list', data: [] });
  }
});

/* ── Status check ── */
router.get('/status', async (_req, res) => {
  const { base, key } = getLLMBase();
  try {
    const headers: Record<string, string> = {};
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const url = key ? `${base}/v1/models` : `${OLLAMA_BASE}/api/tags`;
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });

    if (!r.ok) return res.json({ running: false, provider: key ? 'groq' : 'ollama' });

    const data: any = await r.json();
    const models = key
      ? (data.data ?? []).map((m: any) => m.id)
      : (data.models ?? []).map((m: any) => m.name);

    return res.json({ running: true, provider: key ? 'groq' : 'ollama', models });
  } catch {
    return res.json({ running: false, provider: key ? 'groq' : 'ollama', models: [] });
  }
});

export default router;
