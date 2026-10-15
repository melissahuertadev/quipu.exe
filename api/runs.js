import { applyCors, configError, errorResponse, taloJson, taloRequest } from '../server/talo.js';

const MAX_ELAPSED_MS = 24 * 60 * 60 * 1000;
const MAX_MOVES = 10000;

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'METHOD_NOT_ALLOWED' });

  const missing = configError();
  if (missing) return res.status(503).json({ message: missing });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const runId = String(body.runId || '').trim();
  const playerId = String(body.playerId || '').trim();
  const name = String(body.name || 'Anónimo').trim().slice(0, 18) || 'Anónimo';
  const elapsedMs = Number(body.elapsedMs);
  const totalMoves = Number(body.totalMoves);
  if (runId.length < 8 || runId.length > 100 || playerId.length < 8 || playerId.length > 100
    || !Number.isSafeInteger(elapsedMs) || elapsedMs < 0 || elapsedMs > MAX_ELAPSED_MS
    || !Number.isSafeInteger(totalMoves) || totalMoves < 0 || totalMoves > MAX_MOVES) {
    return res.status(400).json({ message: 'INVALID_RUN_DATA' });
  }

  try {
    const identity = new URLSearchParams({ service: 'anonymous', identifier: playerId });
    const identified = await taloJson(await taloRequest(`/players/identify?${identity}`));
    const aliasId = Number(identified.alias?.id);
    if (!Number.isSafeInteger(aliasId) || aliasId <= 0) throw new Error('TALO_ALIAS_NOT_RETURNED');

    const score = Math.round(elapsedMs / 1000) + 5 * totalMoves;
    const internalName = encodeURIComponent(process.env.TALO_LEADERBOARD_INTERNAL_NAME);
    const data = await taloJson(await taloRequest(`/leaderboards/${internalName}/entries`, {
      method: 'POST',
      headers: { 'x-talo-alias': String(aliasId) },
      body: JSON.stringify({
        score,
        props: [
          { key: 'runId', value: runId },
          { key: 'name', value: name },
          { key: 'elapsedMs', value: String(elapsedMs) },
          { key: 'totalMoves', value: String(totalMoves) },
        ],
      }),
    }));
    if (!data.entry?.id) throw new Error('TALO_ENTRY_NOT_RETURNED');
    return res.status(200).json({ entry: { id: data.entry.id } });
  } catch (error) {
    return errorResponse(res, error);
  }
}
