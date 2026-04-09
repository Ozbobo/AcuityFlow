import { test, expect } from '@playwright/test';

test('happy path: set up, distribute, admission, new shift', async ({ page }) => {
  await page.goto('/');

  // Set RN count to 3
  const rnCard = page.locator('.card').filter({ hasText: 'Available RNs' });
  await rnCard.getByLabel('Increase RN count').click();
  await rnCard.getByLabel('Increase RN count').click();
  await rnCard.getByLabel('Increase RN count').click();
  await expect(rnCard.locator('.val')).toHaveText('3');

  // Go to Census, set a few rooms
  await page.getByRole('link', { name: 'Census' }).click();
  await expect(page.getByRole('heading', { name: 'Census' })).toBeVisible();

  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();

  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /^919/ }).click();
  await page.getByRole('dialog').getByText('LOW').first().click();

  // Distribute from the Census footer
  await page.getByRole('button', { name: /Distribute/ }).click();

  // Assignments page should load
  await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible();
  // At least one RN card should show rooms
  await expect(page.getByText(/rooms · score/).first()).toBeVisible();

  // Open admission modal
  await page.getByRole('button', { name: '+ Admission' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Pick an empty room and a level (921 should be empty)
  await page.getByRole('dialog').getByRole('button', { name: '921' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Suggestion should appear — tap the first one
  const firstSuggestion = page.getByRole('dialog').locator('button').filter({ hasText: /RN\d/ }).first();
  await expect(firstSuggestion).toBeVisible();
  await firstSuggestion.click();

  // Room 921 should now appear somewhere in the Assignments page
  await expect(page.getByText('921')).toBeVisible();

  // New Shift flow (go to Setup)
  await page.getByRole('link', { name: 'Setup' }).click();
  await page.getByRole('button', { name: 'New Shift' }).click();
  await page.getByRole('button', { name: 'Clear' }).click();

  // After new shift, RN count should be 0
  const rnCardAfter = page.locator('.card').filter({ hasText: 'Available RNs' });
  await expect(rnCardAfter.locator('.val')).toHaveText('0');
});
