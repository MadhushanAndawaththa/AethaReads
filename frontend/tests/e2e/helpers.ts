import { expect, type Page } from '@playwright/test';

export function createUser(prefix: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  return {
    email: `${prefix}-${stamp}@example.com`,
    username: `${prefix}_${stamp}`,
    password: 'Password123!',
  };
}

export async function registerUser(page: Page, user: ReturnType<typeof createUser>) {
  await page.goto('/auth/register');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/$/);
}