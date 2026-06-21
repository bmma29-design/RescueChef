const rateLimitMap = new Map();
const dailyMap = new Map();

function getRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxPerMinute = 10;
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  const entry = rateLimitMap.get(ip);
  if (now - entry.start > windowMs) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

function getDailyLimit(ip) {
  const today = new Date().toDateString();
  const key = ip + "_" + today;
  const FREE_LIMIT = 10;
  if (!dailyMap.has(key)) {
    dailyMap.set(key, 1);
    return true;
  }
  const count = dailyMap.get(key);
  if (count >= FREE_LIMIT) return false;
  dailyMap.set(key, count + 1);
  return true;
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

  if (!getRateLimit(ip)) {
    return res.status(429).json({ error: { message: 'יותר מדי בקשות. נסי שוב בעוד דקה.' } });
  }

  const isPro = req.body?.isPro === true;

  if (!isPro && !getDailyLimit(ip)) {
    return res.status(429).json({ error: { message: 'DAILY_LIMIT_REACHED' } });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
