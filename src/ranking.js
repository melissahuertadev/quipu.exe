const RUNS_KEY = 'quipu.completed-runs.v1';
const PLAYER_KEY = 'quipu.talo-player-id.v1';
const PLAYER_NAME_KEY = 'quipu.player-name.v1';
const MEMORY_RUNS = [];

export { PLAYER_NAME_KEY };

export function calculateScore(elapsedMs, totalMoves) {
  return Math.round(elapsedMs / 1000) + totalMoves * 5;
}

export function createRunId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getStablePlayerId() {
  try {
    let id = localStorage.getItem(PLAYER_KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.()
        ?? `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(PLAYER_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function readCompletedRuns() {
  try {
    const stored = JSON.parse(localStorage.getItem(RUNS_KEY) || '[]');
    if (Array.isArray(stored)) return stored.filter(isRun).map((run) => run.status === 'sending' ? { ...run, status: 'pending' } : run);
  } catch { /* Keep completed results available in memory when storage is blocked. */ }
  return MEMORY_RUNS.map((run) => run.status === 'sending' ? { ...run, status: 'pending' } : run);
}

function isRun(run) {
  return run && typeof run.runId === 'string' && typeof run.name === 'string'
    && Number.isFinite(run.elapsedMs) && Number.isFinite(run.totalMoves)
    && Number.isFinite(run.score) && ['pending', 'sending', 'sent'].includes(run.status);
}

function writeRuns(runs) {
  MEMORY_RUNS.splice(0, MEMORY_RUNS.length, ...runs);
  try { localStorage.setItem(RUNS_KEY, JSON.stringify(runs)); } catch { /* Local persistence is best effort. */ }
}

export function saveCompletedRun(run) {
  const runs = readCompletedRuns();
  const existing = runs.find((saved) => saved.runId === run.runId);
  if (existing) return existing;
  const saved = {
    runId: run.runId,
    name: String(run.name || 'Anónimo').trim().slice(0, 18) || 'Anónimo',
    elapsedMs: Math.max(0, Math.round(run.elapsedMs)),
    totalMoves: Math.max(0, Math.round(run.totalMoves)),
    score: calculateScore(run.elapsedMs, run.totalMoves),
    completedAt: run.completedAt || new Date().toISOString(),
    status: 'pending',
  };
  writeRuns([...runs, saved]);
  return saved;
}

export function updateRun(runId, patch) {
  const runs = readCompletedRuns();
  const index = runs.findIndex((run) => run.runId === runId);
  if (index < 0) return null;
  runs[index] = { ...runs[index], ...patch };
  writeRuns(runs);
  return runs[index];
}

export function getRun(runId) {
  return readCompletedRuns().find((run) => run.runId === runId) || null;
}

export function getPendingRuns() {
  return readCompletedRuns().filter((run) => run.status !== 'sent');
}

export function getLatestCompletedRun() {
  return readCompletedRuns().at(-1) || null;
}
