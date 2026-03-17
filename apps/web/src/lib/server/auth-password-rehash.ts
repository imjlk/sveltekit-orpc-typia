import { accounts } from '@repo/db/schema';
import {
	STANDARD_2026Q1_PRESET,
	assessPasswordHash,
	resolveHasherPreset,
	type AuthHasherMetadata,
	type HashPresetDefinition
} from '@repo/auth-hasher-contracts';
import { readAuthHasherMetadata } from '@repo/auth-hasher-client';
import { and, eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { createAuthPasswordHasher, resolveAuthHasherBinding } from './auth-password-hasher';
import { shouldAllowLocalAuthFallback } from './auth-runtime';

type EventLike = Pick<RequestEvent, 'platform' | 'url'>;
type AuthDb = Awaited<ReturnType<typeof import('./auth').getAuthDb>>;

type RehashOutcome =
	| { status: 'skipped'; reason: 'no-binding' | 'missing-target-preset' | 'no-credential-account' | 'already-current' }
	| { status: 'updated'; reasons: string[] };

const fromMetadataToPreset = (metadata: AuthHasherMetadata): HashPresetDefinition => ({
	id: metadata.preset,
	description: `Active AUTH_HASHER build artifact preset '${metadata.preset}'.`,
	argon2id: metadata.argon2id,
	legacyScrypt: STANDARD_2026Q1_PRESET.legacyScrypt
});

const resolveTargetPreset = async (event: EventLike): Promise<HashPresetDefinition | null> => {
	const binding = resolveAuthHasherBinding(event, {
		allowDevFallback: shouldAllowLocalAuthFallback(event)
	});

	if (!binding) {
		return null;
	}

	const metadata = await readAuthHasherMetadata(binding).catch(() => null);
	if (metadata) {
		return fromMetadataToPreset(metadata);
	}

	if (event.platform?.env) {
		const envPreset = resolveHasherPreset(event.platform.env);
		const hasExplicitAuthHasherEnv =
			typeof event.platform.env.AUTH_HASHER_PRESET_ID === 'string' ||
			typeof event.platform.env.AUTH_HASHER_ARGON2_MEMORY_KIB === 'string' ||
			typeof event.platform.env.AUTH_HASHER_ARGON2_TIME_COST === 'string' ||
			typeof event.platform.env.AUTH_HASHER_ARGON2_PARALLELISM === 'string' ||
			typeof event.platform.env.AUTH_HASHER_ARGON2_OUTPUT_LENGTH === 'string';

		if (hasExplicitAuthHasherEnv || envPreset.id !== STANDARD_2026Q1_PRESET.id) {
			return envPreset;
		}
	}

	return null;
};

export const maybeRehashCredentialPasswordAfterEmailSignIn = async (
	event: EventLike,
	input: { userId: string; password: string },
	db?: AuthDb
): Promise<RehashOutcome> => {
	const binding = resolveAuthHasherBinding(event, {
		allowDevFallback: shouldAllowLocalAuthFallback(event)
	});
	if (!binding) {
		return { status: 'skipped', reason: 'no-binding' };
	}

	const targetPreset = await resolveTargetPreset(event);
	if (!targetPreset) {
		return { status: 'skipped', reason: 'missing-target-preset' };
	}

	const authDb = (db ??
		(await import('./auth').then(({ getAuthDb }) => getAuthDb(event as RequestEvent)))) as NonNullable<AuthDb>;
	const credentialAccount = await authDb.query.accounts.findFirst({
		columns: {
			id: true,
			password: true
		},
		where: (accountsTable, { and, eq }) =>
			and(eq(accountsTable.userId, input.userId), eq(accountsTable.providerId, 'credential'))
	});

	if (!credentialAccount?.password) {
		return { status: 'skipped', reason: 'no-credential-account' };
	}

	const assessment = assessPasswordHash(credentialAccount.password, targetPreset);
	if (!assessment.needsRehash) {
		return { status: 'skipped', reason: 'already-current' };
	}

	const hasher = createAuthPasswordHasher(event as RequestEvent, {
		allowDevFallback: false
	});
	const updatedHash = await hasher.hash(input.password);
	const updatedAssessment = assessPasswordHash(updatedHash, targetPreset);
	if (updatedAssessment.needsRehash) {
		throw new Error(
			`AUTH_HASHER produced a hash that does not satisfy target preset '${targetPreset.id}'. Remaining differences: ${updatedAssessment.reasons.join(', ')}.`
		);
	}

	await authDb
	.update(accounts)
	.set({
			password: updatedHash,
			updatedAt: new Date()
		})
		.where(and(eq(accounts.id, credentialAccount.id), eq(accounts.password, credentialAccount.password)));

	return { status: 'updated', reasons: assessment.reasons };
};

const isEmailPasswordSignInRequest = (request: Request): boolean => {
	const url = new URL(request.url);
	return request.method === 'POST' && url.pathname.endsWith('/auth/sign-in/email');
};

const readPasswordFromRequest = async (request: Request): Promise<string | null> => {
	const contentType = request.headers.get('content-type') ?? '';

	if (contentType.includes('application/json')) {
		const json = (await request.json().catch(() => null)) as { password?: unknown } | null;
		return typeof json?.password === 'string' && json.password.length > 0 ? json.password : null;
	}

	if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
		const formData = await request.formData().catch(() => null);
		const password = formData?.get('password');
		return typeof password === 'string' && password.length > 0 ? password : null;
	}

	return null;
};

const readUserIdFromSignInResponse = async (response: Response): Promise<string | null> => {
	if (!response.ok) {
		return null;
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) {
		return null;
	}

	const json = (await response.json().catch(() => null)) as { user?: { id?: unknown } } | null;
	return typeof json?.user?.id === 'string' && json.user.id.length > 0 ? json.user.id : null;
};

export const maybeRehashCredentialPasswordAfterAuthResponse = async (
	event: EventLike,
	request: Request,
	response: Response,
	db?: AuthDb
): Promise<RehashOutcome | null> => {
	if (!isEmailPasswordSignInRequest(request)) {
		return null;
	}

	const [password, userId] = await Promise.all([
		readPasswordFromRequest(request),
		readUserIdFromSignInResponse(response)
	]);

	if (!password || !userId) {
		return null;
	}

	return maybeRehashCredentialPasswordAfterEmailSignIn(
		event,
		{
			userId,
			password
		},
		db
	);
};
