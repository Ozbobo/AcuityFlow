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

  // Re-distribute button should NOT exist (removed in this feature)
  await expect(page.getByRole('button', { name: 'Re-distribute' })).toHaveCount(0);

  // Open admission modal
  await page.getByRole('button', { name: '+ Admission' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Pick an empty room and a level (921 should be empty)
  await page.getByRole('dialog').getByRole('button', { name: '921' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Suggestion should appear — tap the first one
  const firstSuggestion = page.getByRole('dialog').locator('button').filter({ hasText: /load/ }).first();
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

test('locked RN is excluded from admission suggestions', async ({ page }) => {
  await page.goto('/');

  // 2 RNs, 2 rooms
  const rnCard = page.locator('.card').filter({ hasText: 'Available RNs' });
  await rnCard.getByLabel('Increase RN count').click();
  await rnCard.getByLabel('Increase RN count').click();

  await page.getByRole('link', { name: 'Census' }).click();
  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();
  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /Distribute/ }).click();
  await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible();

  // Lock RN 1 via the card toggle
  await page.getByLabel('Lock RN 1').click();
  // Button should now say "Locked"
  await expect(page.getByLabel('Unlock RN 1')).toBeVisible();

  // Open admission, get suggestions
  await page.getByRole('button', { name: '+ Admission' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '919' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Only RN2 should appear in suggestions (RN1 is locked)
  // Suggestion buttons contain "load" in the reason text
  const suggestionButtons = page.getByRole('dialog').locator('button').filter({ hasText: /load/ });
  await expect(suggestionButtons).toHaveCount(1);
  await expect(suggestionButtons.first()).toContainText('RN2');

  // Accept suggestion
  await suggestionButtons.first().click();
  await expect(page.getByText('919')).toBeVisible();
});

test('discharge removes patient from RN assignment', async ({ page }) => {
  await page.goto('/');

  // 1 RN, 2 rooms
  const rnCard = page.locator('.card').filter({ hasText: 'Available RNs' });
  await rnCard.getByLabel('Increase RN count').click();

  await page.getByRole('link', { name: 'Census' }).click();
  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();
  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /Distribute/ }).click();
  await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible();
  await expect(page.getByText('2 rooms')).toBeVisible();

  // Tap room 915 chip to open the room sheet
  await page.locator('button').filter({ hasText: '915' }).filter({ hasText: 'H' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Tap Discharge
  await page.getByRole('button', { name: 'Discharge' }).click();
  // Confirm discharge
  await page.getByRole('dialog').getByRole('button', { name: 'Discharge' }).click();

  // Should be down to 1 room
  await expect(page.getByText('1 rooms')).toBeVisible();
});
