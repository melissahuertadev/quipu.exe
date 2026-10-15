const TALO_API = 'https://api.trytalo.com/v1';

export function configError() {
  if (!process.env.TALO_GAME_API_KEY) return 'TALO_GAME_API_KEY is missing';
  if (!process.env.TALO_LEADERBOARD_INTERNAL_NAME) return 'TALO_LEADERBOARD_INTERNAL_NAME is missing';
  if (!allowedOrigins().length) return 'TALO_ALLOWED_ORIGINS is missing';
  return null;
}

function allowedOrigins() {
  return String(process.env.TALO_ALLOWED_ORIGINS || '')
    .split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean);
}

export function applyCors(req, res) {
  const origin = String(req.headers.origin || '').replace(/\/$/, '');
  if (origin && !allowedOrigins().includes(origin)) {
    res.status(403).json({ message: 'ORIGIN_NOT_ALLOWED' });
    return false;
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  return true;
}

export function taloRequest(path, options = {}) {
  return fetch(`${TALO_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.TALO_GAME_API_KEY}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
}

export async function taloJson(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `TALO_HTTP_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data || {};
}

export function propMap(props = []) {
  return Object.fromEntries((Array.isArray(props) ? props : []).map(({ key, value }) => [key, value]));
}

export function errorResponse(res, error) {
  res.status(502).json({ message: error.message || 'TALO_REQUEST_FAILED' });
}
