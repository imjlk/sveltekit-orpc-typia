import { test, expect } from '@playwright/test';

test.describe('Posts Flow', () => {
  test('should require auth for post REST endpoints', async ({ request }) => {
    const res = await request.get('/api/post/list');
    expect(res.status()).toBe(401);
  });

  test('should redirect anonymous users to sign-in', async ({ page }) => {
    await page.goto('/posts');
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fposts$/);
  });

  test('should sign up and create a protected post', async ({ page }) => {
    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `starter-${uniqueSuffix}@example.com`;

    await page.goto('/auth/sign-up?next=%2Fposts');

    await page.fill('#name', 'Starter User');
    await page.fill('#email', email);
    await page.fill('#password', 'password1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/posts$/);

    await page.fill('[name="title"]', 'Test Post Title');
    await page.fill('[name="content"]', 'Test Post Content');

    await page.getByRole('button', { name: 'Create Post' }).click();

    const postList = page.locator('.posts-list');
    await expect(postList).toContainText('Test Post Title');
    await expect(postList).toContainText('Test Post Content');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

    await page.goto('/auth/sign-in?next=%2Fposts');
    await page.fill('#email', email);
    await page.fill('#password', 'password1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/posts$/);
    await expect(page.locator('.posts-list')).toContainText('Test Post Title');
  });
});
