import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildServer } from './app.js';
import { loadConfig } from './config.js';

// A stand-in for the built frontend
const staticDir = mkdtempSync(join(tmpdir(), 'proposal-builder-'));
writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>Proposal Builder</title>');

const server = (env: NodeJS.ProcessEnv = {}) => buildServer(loadConfig({ STATIC_DIR: staticDir, ...env }));

describe('static files', () => {
  it('serves the frontend', async () => {
    const response = await (await server()).inject({ url: '/' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Proposal Builder');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('sends the pre-compressed copy when the browser accepts it', async () => {
    writeFileSync(join(staticDir, 'index.html.br'), 'brotli bytes');
    const response = await (await server()).inject({ url: '/', headers: { 'accept-encoding': 'br, gzip' } });
    expect(response.headers['content-encoding']).toBe('br');
    expect(response.body).toBe('brotli bytes');
  });

  it('reports health', async () => {
    const response = await (await server()).inject({ url: '/healthz' });
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
