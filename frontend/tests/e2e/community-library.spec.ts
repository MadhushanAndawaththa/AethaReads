import { test, expect } from '@playwright/test';

import { createUser, registerUser } from './helpers';

test('reader can follow, review, comment, and see library progress', async ({ page }) => {
  const user = createUser('reader');

  await registerUser(page, user);

  await page.goto('/novel/the-celestial-throne');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Follow/ }).click();
  await expect(page.getByRole('button', { name: /Following/ })).toBeVisible();

  await page.getByRole('button', { name: /Write a Review/ }).click();
  await page.getByPlaceholder('Review title (optional)').fill('Hooked from chapter one');
  await page.getByPlaceholder('Share your thoughts about this novel…').fill('Strong opening, good momentum, and the presentation feels solid.');
  await page.getByRole('button', { name: 'Submit Review' }).click();
  await expect(page.getByRole('heading', { name: 'Hooked from chapter one' }).first()).toBeVisible();

  await page.getByRole('link', { name: /Start Reading/ }).click();
  await expect(page.getByText(/Chapter 1 of 5/)).toBeVisible();

  await page.getByRole('button', { name: 'Show Comments' }).click();
  await page.getByPlaceholder('Share your thoughts…').fill('Following this one closely.');
  await page.getByRole('button', { name: 'Post Comment' }).click();
  await expect(page.getByText('Following this one closely.').first()).toBeVisible();

  await page.goto('/library');
  await page.getByRole('button', { name: /Following/ }).click();
  await expect(page.getByText('The Celestial Throne')).toBeVisible();
});