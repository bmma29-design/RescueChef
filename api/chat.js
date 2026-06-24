import { kv } from '@vercel/kv';

const ALPHA_MODE = process.env.ALPHA_MODE === 'true';
const RATE_LIMIT_PER_MINUTE = 10;
const FREE_DAILY_LIMIT = 5;
const MAX_TOKENS_CAP = 1500;
const MODEL = 'claude-sonnet-4-6';

async function getRateLimit(ip) {
  const key = `rl:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  try {
    const entry = await kv.get(key);
    if (!entry || now - entry.start > windowMs) {
      await kv.set(key, { count: 1, start: now }, { px: windowMs });
      return true;
    }
    if (entry.count >= RATE_LIMIT_PER_MINUTE) return false;
    await kv.set(key, { count: entry.count + 1, start: entry.start }, { px: windowMs - (now - entry.start) });
    return true;
  } catch {
    return true;
  }
}

async function getDailyLimit(ip) {
  const today = new Date().toDateString();
  const key = `daily:${ip}:${today}`;
  try {
    const count = await kv.get(key);
    if (!count) {
      await kv.set(key, 1, { ex: 86400 });
      return true;
    }
    if (count >= FREE_DAILY_LIMIT) return false;
    await kv.set(key, count + 1, { ex: 86400 });
    return true;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';

  if (!await getRateLimit(ip)) {
    return res.status(429).json({ error: { message: 'יותר מדי בקשות. נסי שוב בעוד דקה.' } });
  }

  const isPro = ALPHA_MODE;

  if (!isPro && !await getDailyLimit(ip)) {
    return res.status(429).json({ error: { message: 'DAILY_LIMIT_REACHED' } });
  }

  const { messages, system, max_tokens } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'Missing messages' } });
  }

  const anthropicBody = {
    model: MODEL,
    max_tokens: Math.min(Number(max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
    system: typeof system === 'string' ? system : undefined,
    messages,
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicBody)
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
