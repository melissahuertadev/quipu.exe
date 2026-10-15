import { applyCors, configError, errorResponse, propMap, taloJson, taloRequest } from '../server/talo.js';

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'METHOD_NOT_ALLOWED' });

  const missing = configError();
  if (missing) return res.status(503).json({ message: missing });

  try {
    const internalName = encodeURIComponent(process.env.TALO_LEADERBOARD_INTERNAL_NAME);
    const query = new URLSearchParams({ page: '0', withDeleted: 'false' });
    const data = await taloJson(await taloRequest(`/leaderboards/${internalName}/entries?${query}`));
    const entries = (Array.isArray(data.entries) ? data.entries : [])
      .filter((entry) => !entry.hidden)
      .map((entry) => {
        const props = propMap(entry.props);
        return {
          runId: String(props.runId || ''),
          name: String(props.name || entry.playerAlias?.displayName || 'Anónimo').slice(0, 18),
          elapsedMs: Number(props.elapsedMs),
          totalMoves: Number(props.totalMoves),
          score: Number(entry.score),
          position: Number.isFinite(Number(entry.position)) ? Number(entry.position) + 1 : null,
        };
      })
      .filter((entry) => Number.isFinite(entry.elapsedMs) && Number.isFinite(entry.totalMoves));
    return res.status(200).json({ entries });
  } catch (error) {
    return errorResponse(res, error);
  }
}
