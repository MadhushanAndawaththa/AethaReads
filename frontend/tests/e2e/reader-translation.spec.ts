import { test, expect } from '@playwright/test';

test('reader can translate a chapter and restore the original content', async ({ page }) => {
  await page.route('https://translate.googleapis.com/**', async (route) => {
    const url = new URL(route.request().url());
    const targetLanguage = url.searchParams.get('tl');
    const originalText = url.searchParams.get('q') ?? '';
    const translated = targetLanguage === 'si' ? `සිංහල: ${originalText}` : `English: ${originalText}`;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([[[translated, originalText, null, null, 1]]]),
    });
  });

  await page.goto('/novel/the-celestial-throne/1');
  await page.waitForLoadState('networkidle');

  const firstParagraph = page.locator('#chapter-content p').first();
  const originalText = (await firstParagraph.textContent()) ?? '';

  const sinhalaButton = page.getByRole('button', { name: 'සිංහල' });
  await expect(sinhalaButton).toBeEnabled();
  await sinhalaButton.click();
  await expect(firstParagraph).toContainText('සිංහල:');

  await page.getByRole('button', { name: 'Original' }).click();
  await expect(firstParagraph).toHaveText(originalText);
});