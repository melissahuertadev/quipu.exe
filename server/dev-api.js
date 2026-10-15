import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import leaderboardHandler from '../api/leaderboard.js';
import runsHandler from '../api/runs.js';

loadLocalEnv();

const handlers = {
  '/api/leaderboard': leaderboardHandler,
  '/api/runs': runsHandler,
};
const port = Number(process.env.LOCAL_API_PORT || 3000);
const host = '127.0.0.1';

const server = createServer(async (incoming, outgoing) => {
  const pathname = new URL(incoming.url || '/', `http://${host}`).pathname;
  const handler = handlers[pathname];
  if (!handler) {
    outgoing.writeHead(404, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify({ message: 'NOT_FOUND' }));
    return;
  }

  try {
    const body = incoming.method === 'POST' ? await readJsonBody(incoming) : undefined;
    const response = createVercelResponse(outgoing);
    await handler({ method: incoming.method, headers: incoming.headers, body }, response);
    if (!outgoing.writableEnded) response.end();
  } catch (error) {
    const status = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
    outgoing.writeHead(status, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify({ message: status === 400 ? 'INVALID_JSON_BODY' : 'LOCAL_API_ERROR' }));
  }
});

server.listen(port, host, () => {
  console.log(`Local leaderboard API listening at http://localhost:${port}/api`);
});
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. The local API may already be running; reuse it or stop that process first.`);
    process.exitCode = 1;
    return;
  }
  throw error;
});

function loadLocalEnv() {
  let contents;
  try { contents = readFileSync(resolve(process.cwd(), '.env'), 'utf8'); }
  catch { return; }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[match[1]] = value;
  }
}

function readJsonBody(request) {
  return new Promise((resolveBody, reject) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 16_384) {
        const error = new Error('BODY_TOO_LARGE');
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });
    request.on('end', () => {
      if (!raw) return resolveBody({});
      try { resolveBody(JSON.parse(raw)); } catch (error) { reject(error); }
    });
    request.on('error', reject);
  });
}

function createVercelResponse(response) {
  const adapter = {
    status(code) { response.statusCode = code; return adapter; },
    setHeader(name, value) { response.setHeader(name, value); },
    json(data) {
      if (!response.headersSent) response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(data));
      return adapter;
    },
    end(data) { response.end(data); return adapter; },
  };
  return adapter;
}
