const proxyUrl = String(import.meta.env?.VITE_TALO_PROXY_URL || '').trim().replace(/\/$/, '');
export const leaderboardConfigured = Boolean(proxyUrl);

async function request(path, options = {}) {
  if (!leaderboardConfigured) throw new Error('TALO_PROXY_NOT_CONFIGURED');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(`${proxyUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...options.headers },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('REQUEST_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.message || `HTTP_${response.status}`);
  }
  return response.json();
}

export async function fetchGlobalEntries() {
  const data = await request('/leaderboard?limit=50');
  if (!Array.isArray(data.entries)) throw new Error('INVALID_LEADERBOARD_RESPONSE');
  return sortLeaderboardEntries(data.entries);
}

export function sortLeaderboardEntries(entries) {
  return entries
    .filter((entry) => entry && Number.isFinite(Number(entry.score)))
    .map((entry) => ({
      runId: String(entry.runId || ''),
      name: String(entry.name || 'Anónimo').slice(0, 18),
      elapsedMs: Number(entry.elapsedMs),
      totalMoves: Number(entry.totalMoves),
      score: Number(entry.score),
      position: Number.isFinite(Number(entry.position)) ? Number(entry.position) : null,
    }))
    .sort((a, b) => a.score - b.score
      || (Number.isFinite(a.elapsedMs) && Number.isFinite(b.elapsedMs) ? a.elapsedMs - b.elapsedMs : 0));
}

export async function submitCompletedRun(run, playerId) {
  return request('/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      runId: run.runId,
      playerId,
      name: run.name,
      elapsedMs: run.elapsedMs,
      totalMoves: run.totalMoves,
      score: run.score,
    }),
  });
}
