import { test, expect } from '@playwright/test';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import { appContract } from '@repo/shared';

test.describe('Posts Flow', () => {
  const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/rpc';
  const client: ContractRouterClient<typeof appContract> = createORPCClient(
    new RPCLink({ url: apiUrl }),
  );

  test('should load posts on page load', async () => {
    const response = await client.post.list();
    expect(Array.isArray(response)).toBe(true);
  });

  test('should create post successfully', async ({ page }) => {
    await page.goto('/posts');

    await page.fill('[name="title"]', 'Test Post Title');
    await page.fill('[name="content"]', 'Test Post Content');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    const postList = page.locator('ul');
    await expect(postList).toContainText('Test Post Title');
    await expect(postList).toContainText('Test Post Content');
  });

  test('should show validation error for empty title', async ({ page }) => {
    await page.goto('/posts');

    await page.click('button[type="submit"]');

    const errorElement = page.locator('.error').first();

    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(/required/i);
  });

  test('should show validation error for empty content', async ({ page }) => {
    await page.goto('/posts');

    await page.fill('[name="title"]', 'Valid Title');
    await page.click('button[type="submit"]');

    const errorElement = page.locator('.error').first();

    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(/required/i);
  });
});
