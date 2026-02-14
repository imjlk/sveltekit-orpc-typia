import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// D1Database is a Cloudflare Workers global type (or provided by @miniflare/d1 in tests).
// We keep the input loosely typed so this module can be imported without requiring CF typings.
export function createD1Db(client: unknown) {
  return drizzle(client as never, { schema });
}

