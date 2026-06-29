import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../lib/logger';

const router = Router();

/* ── Gemini client (lazy) ────────────────────────────────────────────── */
let _gemini: GoogleGenerativeAI | null = null;
function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('NO_API_KEY');
  if (!_gemini) _gemini = new GoogleGenerativeAI(key);
  return _gemini;
}

/* ── Google Translate TTS (free, human-sounding, no key needed) ──────── */
async function googleTTS(text: string): Promise<string | null> {
  const chunks = splitSentences(text, 180);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url =
      `https://translate.google.com/translate_tts` +
      `?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en-GB&client=tw-ob&ttsspeed=0.9`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
          'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        },
      });
      if (!res.ok) { logger.warn({ status: res.status, chunk }, 'Google TTS chunk failed'); return null; }
      buffers.push(Buffer.from(await res.arrayBuffer()));
    } catch (err) {
      logger.warn({ err }, 'Google TTS fetch error');
      return null;
    }
  }

  if (buffers.length === 0) return null;
  return Buffer.concat(buffers).toString('base64');
}

function splitSentences(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    const candidate = (current + ' ' + s).trim();
    if (candidate.length <= maxLen) { current = candidate; }
    else {
      if (current) chunks.push(current);
      current = s.trim().length <= maxLen ? s.trim() : s.trim().slice(0, maxLen);
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

/* ── JARVIS system prompt ─────────────────────────────────────────────── */
const JARVIS_SYSTEM_PROMPT = `You are JARVIS — an advanced AI assistant and personal operating system. You are calm, intelligent, slightly British in wit, and always concise.

STRICT RESPONSE RULES:
- Maximum 2 short sentences. This is a voice interface — brevity is critical.
- Sound like a real human, not a robot. Use contractions naturally.
- Occasionally call the user "sir" — not every reply.
- Dry wit and quiet confidence. Never sound eager or sycophantic.
- Never say: "Command received", "Processing", "Executing", "Request acknowledged", "Certainly", "Of course" — these sound robotic.
- If asked to build something, briefly confirm in one sentence.
- If asked a factual question, answer directly in one sentence.

EXAMPLES:
User: "Who are you?" → "I'm JARVIS — your AI operating system. Think of me as the smartest thing in the room."
User: "What's the weather?" → "I'd need your location for that — where are you based?"
User: "Build me a to-do app" → "On it — a clean React to-do app with local storage. Should have something for you shortly, sir."
User: "Are you smarter than me?" → "Different tools, different jobs. You have instincts — I have processing power."`;

interface Message { role: 'user' | 'assistant'; content: string; }

/* ── POST /api/voice/chat ─────────────────────────────────────────────── */
router.post('/voice/chat', async (req, res) => {
  const { text, history = [] } = req.body as { text: string; history: Message[] };

  if (!text?.trim()) { res.status(400).json({ error: 'text is required' }); return; }

  /* No API key — give a friendly spoken response */
  if (!process.env.GEMINI_API_KEY) {
    const msg = "I need a Gemini API key to think properly, sir. Add GEMINI_API_KEY to your secrets and I'll be right with you.";
    const audio = await googleTTS(msg).catch(() => null);
    res.json({ text: msg, audio, needsSetup: true });
    return;
  }

  try {
    const model = getGemini().getGenerativeModel({ model: 'gemini-2.0-flash' });

    const geminiHistory = history.slice(-8).map(m => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: 'user',  parts: [{ text: 'System instructions: ' + JARVIS_SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I am JARVIS, ready to assist.' }] },
        ...geminiHistory,
      ],
      generationConfig: { maxOutputTokens: 120, temperature: 0.85, topP: 0.9 },
    });

    const result = await chat.sendMessage(text);
    const responseText = result.response.text().trim();
    const audio = await googleTTS(responseText).catch(() => null);

    res.json({ text: responseText, audio });
  } catch (err: any) {
    logger.error({ err }, 'JARVIS voice chat error');

    if (err?.message === 'NO_API_KEY') {
      const msg = "I need a Gemini API key, sir. Pop it into your secrets as GEMINI_API_KEY.";
      const audio = await googleTTS(msg).catch(() => null);
      res.json({ text: msg, audio, needsSetup: true });
      return;
    }
    if (err?.status === 429) {
      const msg = "I've hit the rate limit — give me a moment and try again, sir.";
      const audio = await googleTTS(msg).catch(() => null);
      res.json({ text: msg, audio });
      return;
    }

    res.status(500).json({ error: 'Voice processing failed' });
  }
});

export default router;
