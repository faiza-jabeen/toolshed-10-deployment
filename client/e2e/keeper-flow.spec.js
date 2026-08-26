import { test, expect } from '@playwright/test';

/**
 * One journey, end to end, through the real stack:
 *   sign in → add a tool → see it in the list → lend it → retire it → sign out
 *
 * Every step is a thing a keeper actually does at the desk on a Saturday.
 */

const KEEPER = { email: 'keeper@toolshed.test', password: 'shed-ladder-9912' };
const TAG = `TS-0${Math.floor(Math.random() * 800 + 100)}`;

test('a keeper can add a tool, lend it, retire it, and sign out', async ({ page }) => {
  await page.goto('/');

  // --- the catalogue loads at all ------------------------------------------
  await expect(page.getByRole('heading', { name: /everything the shed owns/i })).toBeVisible();

  // --- signed out, the row actions are not available ------------------------
  await expect(page.getByRole('button', { name: /^retire$/i })).toHaveCount(0);

  // --- sign in --------------------------------------------------------------
  await page.getByPlaceholder('email').fill(KEEPER.email);
  await page.getByPlaceholder('password').fill(KEEPER.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByText('keeper')).toBeVisible();

  // --- add a tool -----------------------------------------------------------
  await page.getByLabel(/asset tag/i).fill(TAG);
  await page.getByLabel(/^name/i).fill('E2E test router');
  await page.getByLabel(/shelf/i).fill('E1');
  await page.getByLabel(/deposit/i).fill('12');
  await page.getByRole('button', { name: /add tool/i }).click();

  const card = page.locator('.row', { hasText: TAG });
  await expect(card).toBeVisible();
  await expect(page.getByText(new RegExp(`${TAG} added`, 'i'))).toBeVisible();

  // --- the stats strip must agree with the list -----------------------------
  const total = page.locator('.stat', { hasText: 'in the catalogue' });
  const before = Number(await total.locator('.stat__value').innerText());

  // --- lend it out ----------------------------------------------------------
  await card.getByRole('button', { name: /mark out on loan/i }).click();
  await expect(card.getByText('Out on loan')).toBeVisible();

  // --- the search filters it ------------------------------------------------
  await page.getByLabel(/search the catalogue/i).fill(TAG);
  await expect(page.locator('.row')).toHaveCount(1);

  await page.getByLabel(/search the catalogue/i).fill('definitely-not-a-tool');
  await expect(page.getByText(/nothing matches that/i)).toBeVisible();
  await page.getByRole('button', { name: /clear filters/i }).click();

  // --- retire it, and confirm the counts follow -----------------------------
  await card.getByRole('button', { name: /retire/i }).click();
  await expect(card).toHaveCount(0);
  await expect(total.locator('.stat__value')).toHaveText(String(before - 1));

  // --- sign out, and the actions go away again ------------------------------
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page.getByRole('button', { name: /^retire$/i })).toHaveCount(0);
  await expect(page.getByText(/sign in as a keeper/i).first()).toBeVisible();
});

test('a member can read the catalogue but cannot change it', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('email').fill('member@toolshed.test');
  await page.getByPlaceholder('password').fill('shed-ladder-9912');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByText('member')).toBeVisible();
  await expect(page.getByRole('button', { name: /add tool/i })).toHaveCount(0);
  await expect(page.getByText(/sign in as a keeper/i).first()).toBeVisible();
});
