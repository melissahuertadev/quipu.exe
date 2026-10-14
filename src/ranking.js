const STORAGE_KEY = 'quipu.ranking.v1';
export const PLAYER_NAME_KEY = 'quipu.player-name.v1';
export const RANKING_LIMIT = 10;

export function calculateScore(elapsedMs, totalMoves) {
  return Math.round(elapsedMs / 1000) + totalMoves * 5;
}

export function readRanking() {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(records)) return [];
    return records.filter((record) => record && typeof record.runId === 'string' && typeof record.name === 'string'
      && Number.isFinite(record.elapsedMs) && Number.isFinite(record.totalMoves) && Number.isFinite(record.score)
      && typeof record.date === 'string')
      .sort((a, b) => a.score - b.score || a.elapsedMs - b.elapsedMs)
      .slice(0, RANKING_LIMIT);
  } catch { return []; }
}

export function recordCompletedRun(run) {
  try {
    const records = readRanking();
    if (records.some((record) => record.runId === run.runId)) return records;
    const entry = {
      runId: run.runId,
      name: String(run.name || 'Anónimo').trim().slice(0, 18) || 'Anónimo',
      elapsedMs: Math.max(0, Math.round(run.elapsedMs)),
      totalMoves: Math.max(0, Math.round(run.totalMoves)),
      score: calculateScore(run.elapsedMs, run.totalMoves),
      date: run.date || new Date().toISOString(),
    };
    const updated = [...records, entry]
      .sort((a, b) => a.score - b.score || a.elapsedMs - b.elapsedMs)
      .slice(0, RANKING_LIMIT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch { return []; }
}

export function clearRanking() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Ranking storage is optional. */ }
}
