import { afterEach, describe, expect, test } from 'bun:test';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import { createDb } from '@repo/db/bun';
import { migrateBunSqliteWithLock } from '@repo/db/migrations';
import { users } from '@repo/db/schema';
import { appContract } from '@repo/shared';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOrpcFetchHandler } from './handler';
import { createAppRouter } from './router';
import type { AppContext, DbClient } from './types';

const cleanupPaths = new Set<string>();
const userId = 'user_router_test';

afterEach(async () => {
  await Promise.all(
    [...cleanupPaths].map(async (path) => {
      await rm(path, { force: true }).catch(() => undefined);
      await rm(`${path}.migrate.lock`, { force: true }).catch(() => undefined);
    }),
  );
  cleanupPaths.clear();
});

type TestClientOptions = {
  auth?: AppContext['auth'];
  edgeGuard?: AppContext['edgeGuard'];
};

const createTestClient = async (
  options: TestClientOptions = {},
): Promise<{
  client: ContractRouterClient<typeof appContract>;
  db: DbClient;
}> => {
  const dbPath = join(tmpdir(), `cloudflare-first-starter.api.${randomUUID()}.sqlite`);
  cleanupPaths.add(dbPath);

  const db = createDb(dbPath);
  await migrateBunSqliteWithLock(db, dbPath);

  const now = new Date();
  await db.insert(users).values({
    id: userId,
    name: 'Router Test User',
    email: 'router-test@example.com',
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  });

  const handler = createOrpcFetchHandler(createAppRouter(db), {
    prefix: '/rpc',
    logErrors: false,
    createContext: (request): AppContext => ({
      auth: options.auth === undefined ? { userId } : options.auth,
      request,
      edgeGuard: options.edgeGuard ?? null,
      postEvents: null,
    }),
  });

  const fetch: typeof globalThis.fetch = (input, init) =>
    handler(input instanceof Request ? input : new Request(input, init));

  const client: ContractRouterClient<typeof appContract> = createORPCClient(
    new RPCLink({
      url: 'https://starter.test/rpc',
      fetch,
    }),
  );

  return { client, db };
};

describe('app router', () => {
  test('runs the default category, tag, post, and comment flow', async () => {
    const { client } = await createTestClient();

    const parentCategory = await client.category.create({ name: 'Launches' });
    const childCategory = await client.category.create({
      name: 'Weekly updates',
      parentId: parentCategory.id,
    });
    const categoryTree = await client.category.tree();

    expect(categoryTree).toEqual([
      expect.objectContaining({
        id: parentCategory.id,
        children: [expect.objectContaining({ id: childCategory.id })],
      }),
    ]);

    const tag = await client.tag.create({ name: 'release' });
    const duplicateTag = await client.tag.create({ name: 'release' });
    expect(duplicateTag.id).toBe(tag.id);

    const createdPost = await client.post.create({
      title: '  First public update  ',
      content: '  A contract-first post body.  ',
      categoryId: childCategory.id,
      tagIds: [tag.id, tag.id],
    });

    expect(createdPost).toEqual(
      expect.objectContaining({
        authorId: userId,
        title: 'First public update',
        content: 'A contract-first post body.',
        categoryId: childCategory.id,
      }),
    );
    expect(typeof createdPost.createdAt).toBe('string');

    const withMeta = await client.post.getWithMeta({ id: createdPost.id });
    expect(withMeta.category?.id).toBe(childCategory.id);
    expect(withMeta.tags).toEqual([expect.objectContaining({ id: tag.id, name: 'release' })]);

    const comment = await client.comment.create({
      postId: createdPost.id,
      content: '  Looks good.  ',
    });
    expect(comment.content).toBe('Looks good.');

    const [commentsByPost, withComments, posts, activity] = await Promise.all([
      client.comment.listByPost({ postId: createdPost.id }),
      client.post.getWithComments({ id: createdPost.id }),
      client.post.list(),
      client.post.listActivity(),
    ]);

    expect(commentsByPost).toHaveLength(1);
    expect(withComments.comments).toEqual([expect.objectContaining({ id: comment.id })]);
    expect(posts).toEqual([expect.objectContaining({ id: createdPost.id })]);
    expect(activity).toEqual([]);
  });

  test('requires auth for protected post procedures', async () => {
    const { client } = await createTestClient({ auth: null });

    await expect(
      client.post.create({
        title: 'No auth',
        content: 'This should be rejected.',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  test('surfaces edge guard rate limits through the post contract', async () => {
    const { client } = await createTestClient({
      edgeGuard: {
        getMode: async () => 'ratelimit',
        checkPostCreateLimit: async () => ({
          allowed: false,
          limit: 5,
          remaining: 0,
          retryAfterSeconds: 45,
        }),
      },
    });

    await expect(
      client.post.create({
        title: 'Limited',
        content: 'This should be rate limited.',
      }),
    ).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      data: {
        limit: 5,
        remaining: 0,
        retryAfterSeconds: 45,
      },
    });
  });

  test('returns bad request errors for invalid relations', async () => {
    const { client } = await createTestClient();

    await expect(client.comment.create({ postId: 999_999, content: 'Missing post' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      data: { reason: 'Invalid postId' },
    });
  });
});
