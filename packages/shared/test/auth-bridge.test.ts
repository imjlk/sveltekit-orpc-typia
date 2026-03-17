import { describe, expect, test } from 'bun:test';
import { createAuthBridgeHeaders, verifyAuthBridgeHeaders } from '../src/transport/auth-bridge';

describe('auth-bridge', () => {
	test('round-trips a signed user id', async () => {
		const headers = await createAuthBridgeHeaders('user_123', 'secret-key', new Date('2026-03-09T00:00:00.000Z'));

		await expect(
			verifyAuthBridgeHeaders(headers, 'secret-key', new Date('2026-03-09T00:00:30.000Z')),
		).resolves.toBe('user_123');
	});

	test('rejects expired headers', async () => {
		const headers = await createAuthBridgeHeaders('user_123', 'secret-key', new Date('2026-03-09T00:00:00.000Z'));

		await expect(
			verifyAuthBridgeHeaders(headers, 'secret-key', new Date('2026-03-09T00:02:00.000Z')),
		).resolves.toBeNull();
	});

	test('rejects tampered signatures', async () => {
		const headers = await createAuthBridgeHeaders('user_123', 'secret-key', new Date('2026-03-09T00:00:00.000Z'));

		await expect(
			verifyAuthBridgeHeaders(
				{
					...headers,
					'x-orpc-auth-signature': 'tampered'
				},
				'secret-key',
				new Date('2026-03-09T00:00:30.000Z'),
			),
		).resolves.toBeNull();
	});
});
