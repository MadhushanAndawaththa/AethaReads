import { test, expect } from '@playwright/test';

import { createUser, registerUser } from './helpers';

test('author can create a Sinhala novel and published chapter renders safely', async ({ page }) => {
  const user = createUser('author');
  const novelTitle = `Sinhala Journey ${Date.now()}`;

  await registerUser(page, user);

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Yes, Become an Author' }).click();
  await expect(page.getByRole('heading', { name: 'Author Dashboard' })).toBeVisible();

  await page.getByRole('link', { name: /New Novel/ }).click();
  await page.getByLabel('Title *').fill(novelTitle);
  await page.getByLabel('Description').fill('A Sinhala-first test novel for verification.');
  await page.getByLabel('Primary Language').selectOption('si');
  await page.getByRole('button', { name: 'Create Novel' }).click();

  const novelCard = page.locator('.card', { hasText: novelTitle }).first();
  await expect(novelCard).toBeVisible();
  await novelCard.getByRole('link', { name: 'Manage' }).click();

  await page.getByRole('link', { name: '+ New Chapter' }).click();
  await page.getByLabel('Chapter Title *').fill('පළමු පියවර');
  await page.getByLabel('Content (Markdown) *').fill('<p>ආයුබෝවන් පාඨකයනි</p><img src="x" onerror="window.__xss = 1"><script>window.__xss = 2</script>');
  await page.getByLabel('Publish Immediately').check();
  await page.getByRole('button', { name: 'Publish Chapter' }).click();

  await page.goto('/browse?language=si');
  const browseNovelLink = page.getByRole('link', { name: new RegExp(novelTitle) }).first();
  await expect(browseNovelLink).toBeVisible();
  await browseNovelLink.click();
  await expect(page).toHaveURL(/\/novel\/[^/]+$/);

  await page.getByRole('link', { name: /Start Reading/ }).click();
  const chapterContent = page.locator('#chapter-content');
  await expect(chapterContent).toContainText('ආයුබෝවන් පාඨකයනි');
  await expect(chapterContent.locator('script')).toHaveCount(0);
  expect(await chapterContent.locator('img').getAttribute('onerror')).toBeNull();
  expect(await page.evaluate(() => (window as { __xss?: number }).__xss ?? null)).toBeNull();
});