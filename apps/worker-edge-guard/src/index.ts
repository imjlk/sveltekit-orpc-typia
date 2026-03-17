import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import type { CheckPostCreateLimitInput, CheckPostCreateLimitResult, EdgeGuardMode } from '@repo/shared';
import {
	getRetryAfterSeconds,
	getWindowStart,
	normalizeGuardMode,
	POST_CREATE_LIMIT,
	POST_CREATE_PERIOD_SECONDS,
	toRateLimitBindingResult
} from './policy';

type Env = Cloudflare.Env;

type CounterRow = {
	count: number;
};

export class RateLimiterState extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.blockConcurrencyWhile(async () => {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS windows (
					window_start INTEGER PRIMARY KEY,
					count INTEGER NOT NULL
				)
			`);
		});
	}

	async check(limit = POST_CREATE_LIMIT, periodSeconds = POST_CREATE_PERIOD_SECONDS, nowMs = Date.now()): Promise<CheckPostCreateLimitResult> {
		const windowStart = getWindowStart(nowMs, periodSeconds);
		const previousWindowStart = windowStart - periodSeconds * 1000;

		this.ctx.storage.sql.exec('DELETE FROM windows WHERE window_start < ?', previousWindowStart);

		const currentCount =
			this.ctx.storage.sql.exec<CounterRow>('SELECT count FROM windows WHERE window_start = ?', windowStart).toArray()[0]
				?.count ?? 0;

		if (currentCount >= limit) {
			return {
				allowed: false,
				limit,
				remaining: 0,
				retryAfterSeconds: getRetryAfterSeconds(nowMs, windowStart, periodSeconds)
			};
		}

		if (currentCount === 0) {
			this.ctx.storage.sql.exec('INSERT INTO windows (window_start, count) VALUES (?, ?)', windowStart, 1);
		} else {
			this.ctx.storage.sql.exec('UPDATE windows SET count = count + 1 WHERE window_start = ?', windowStart);
		}

		return {
			allowed: true,
			limit,
			remaining: Math.max(limit - (currentCount + 1), 0)
		};
	}
}

export default class EdgeGuardWorker extends WorkerEntrypoint<Env> {
	override fetch(_request: Request): Response {
		return new Response('EDGE_GUARD is internal-only', { status: 404 });
	}

	async getMode(): Promise<EdgeGuardMode> {
		return normalizeGuardMode(this.env.EDGE_GUARD_MODE);
	}

	async checkPostCreateLimit(input: CheckPostCreateLimitInput): Promise<CheckPostCreateLimitResult> {
		if (input.route !== 'post.create') {
			throw new Error(`Unsupported EDGE_GUARD route: ${input.route}`);
		}

		const mode = await this.getMode();
		if (mode === 'do') {
			if (!this.env.RATE_LIMITER_STATE) {
				throw new Error('EDGE_GUARD_MODE=do requires a RATE_LIMITER_STATE Durable Object binding.');
			}

			return this.env.RATE_LIMITER_STATE.getByName(input.key).check(
				POST_CREATE_LIMIT,
				POST_CREATE_PERIOD_SECONDS
			);
		}

		if (!this.env.RATE_LIMITER) {
			throw new Error('EDGE_GUARD_MODE=ratelimit requires a RATE_LIMITER binding.');
		}

		const outcome = await this.env.RATE_LIMITER.limit({ key: input.key });
		return toRateLimitBindingResult(outcome.success, POST_CREATE_LIMIT, POST_CREATE_PERIOD_SECONDS);
	}
}
