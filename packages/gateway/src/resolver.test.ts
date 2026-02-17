import { describe, expect, it } from 'bun:test';

import { resolveUpstream } from './resolver';

const createBinding = () => ({
  fetch: async (_request: Request) => new Response('ok'),
});

describe('resolveUpstream', () => {
  it('prefers per-router binding over per-router URL', () => {
    const binding = createBinding();

    const upstream = resolveUpstream('rpc', {
      routerName: 'post',
      platform: {
        env: {
          ORPC_POST: binding,
          ORPC_POST_URL: 'https://example.com/rpc',
        },
      },
    });

    expect(upstream).toEqual({ kind: 'binding', binding });
  });

  it('resolves per-router binding from ORPC_<ROUTER>_BINDING indirection', () => {
    const binding = createBinding();

    const upstream = resolveUpstream('rpc', {
      routerName: 'post',
      platform: {
        env: {
          ORPC_POST_BINDING: 'POST_WORKER',
          POST_WORKER: binding,
        },
      },
    });

    expect(upstream).toEqual({ kind: 'binding', binding });
  });

  it('uses per-router URL when no per-router binding exists', () => {
    const upstream = resolveUpstream('rpc', {
      routerName: 'post',
      platform: { env: { ORPC_POST_URL: 'https://example.com' } },
    });

    expect(upstream).toEqual({ kind: 'url', url: 'https://example.com/rpc' });
  });

  it('uses default binding before default URL', () => {
    const binding = createBinding();

    const upstream = resolveUpstream('rpc', {
      routerName: 'post',
      platform: {
        env: {
          ORPC_DEFAULT: binding,
          ORPC_DEFAULT_URL: 'https://example.com/rpc',
        },
      },
    });

    expect(upstream).toEqual({ kind: 'binding', binding });
  });

  it('supports ORPC_API as default binding fallback', () => {
    const binding = createBinding();

    const upstream = resolveUpstream('rpc', {
      platform: { env: { ORPC_API: binding } },
    });

    expect(upstream).toEqual({ kind: 'binding', binding });
  });

  it('uses configured default URL from platform env before local mode', () => {
    const upstream = resolveUpstream('rpc', {
      platform: { env: { ORPC_API_URL: 'https://example.com', ORPC_IN_PROCESS: '1' } },
    });

    expect(upstream).toEqual({ kind: 'url', url: 'https://example.com/rpc' });
  });

  it('uses node env URL fallback when platform URL vars are unset', () => {
    const upstream = resolveUpstream('api', {
      nodeEnv: { VITE_API_URL: 'https://example.com/rpc' },
    });

    expect(upstream).toEqual({ kind: 'url', url: 'https://example.com/api' });
  });

  it('returns local when in-process is enabled and no binding or URL exists', () => {
    const upstream = resolveUpstream('rpc', {
      platform: { env: { ORPC_IN_PROCESS: 'true' } },
    });

    expect(upstream).toEqual({ kind: 'local' });
  });

  it('falls back to default local upstream URL when nothing is configured', () => {
    const upstream = resolveUpstream('api', {
      nodeEnv: {},
    });

    expect(upstream).toEqual({ kind: 'url', url: 'http://127.0.0.1:3000/api' });
  });
});
