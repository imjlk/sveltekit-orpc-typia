import { describe, expect, test } from 'bun:test';
import { resolveClientIp, resolveEdgeGuardBinding, resolvePostEventsQueue } from './capabilities';

describe('capabilities', () => {
  test('returns null when EDGE_GUARD is absent', () => {
    expect(resolveEdgeGuardBinding(undefined)).toBeNull();
  });

  test('throws on malformed EDGE_GUARD binding', () => {
    expect(() => resolveEdgeGuardBinding({ EDGE_GUARD: {} })).toThrow(
      'Invalid EDGE_GUARD binding. Expected checkPostCreateLimit() and getMode() methods.',
    );
  });

  test('resolves a valid EDGE_GUARD binding', async () => {
    const binding = {
      checkPostCreateLimit: async () => ({ allowed: true, limit: 5, remaining: 4 }),
      getMode: async () => 'ratelimit' as const,
    };

    const resolved = resolveEdgeGuardBinding({ EDGE_GUARD: binding });
    expect(resolved).not.toBeNull();
    await expect(resolved!.getMode()).resolves.toBe('ratelimit');
  });

  test('returns null when POST_EVENTS is absent', () => {
    expect(resolvePostEventsQueue(undefined)).toBeNull();
  });

  test('throws on malformed POST_EVENTS binding', () => {
    expect(() => resolvePostEventsQueue({ POST_EVENTS: {} })).toThrow(
      'Invalid POST_EVENTS binding. Expected a Queue-like binding with send().',
    );
  });

  test('prefers cf-connecting-ip and falls back through proxy headers', () => {
    const cfRequest = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '203.0.113.10', 'x-forwarded-for': '198.51.100.1' },
    });
    expect(resolveClientIp(cfRequest)).toBe('203.0.113.10');

    const proxyRequest = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '198.51.100.2, 198.51.100.3' },
    });
    expect(resolveClientIp(proxyRequest)).toBe('198.51.100.2');
  });
});
