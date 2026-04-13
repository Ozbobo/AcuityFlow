import { test, expect } from '@playwright/test';

test('happy path: setup wizard, distribute, admission, new shift', async ({ page }) => {
  await page.goto('/');

  // Setup Wizard should be visible
  await expect(page.getByRole('heading', { name: 'New Shift' })).toBeVisible();

  // Set RN count to 3
  await page.getByLabel('Increase RN count').click();
  await page.getByLabel('Increase RN count').click();
  await page.getByLabel('Increase RN count').click();

  // Set census: tap rooms to set acuity
  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();

  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /^919/ }).click();
  await page.getByRole('dialog').getByText('LOW').first().click();

  // Distribute
  await page.getByRole('button', { name: /Distribute/ }).click();

  // Wizard should close, Map tab should be visible (default route)
  await expect(page.getByRole('heading', { name: 'New Shift' })).not.toBeVisible();

  // Navigate to Patients tab
  await page.getByRole('link', { name: 'Patients' }).click();
  await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible();

  // Should see occupied rooms in the list
  await expect(page.getByText('915')).toBeVisible();
  await expect(page.getByText('917')).toBeVisible();
  await expect(page.getByText('919')).toBeVisible();

  // Open admission
  await page.getByRole('button', { name: '+ Admission' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Pick room 921 and medium acuity
  await page.getByRole('dialog').getByRole('button', { name: '921' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Suggestion should appear — tap the first one
  const firstSuggestion = page.getByRole('dialog').locator('button').filter({ hasText: /load/ }).first();
  await expect(firstSuggestion).toBeVisible();
  await firstSuggestion.click();

  // Room 921 should now appear in the patient list
  await expect(page.getByText('921')).toBeVisible();

  // New Shift — go to RNs tab
  await page.getByRole('link', { name: 'RNs' }).click();
  await page.getByRole('button', { name: 'New Shift' }).click();
  await page.getByRole('button', { name: 'Clear' }).click();

  // Setup Wizard should reappear
  await expect(page.getByRole('heading', { name: 'New Shift' })).toBeVisible();
});

test('locked RN is excluded from admission suggestions', async ({ page }) => {
  await page.goto('/');

  // Setup: 2 RNs, 2 rooms
  await page.getByLabel('Increase RN count').click();
  await page.getByLabel('Increase RN count').click();

  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();
  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /Distribute/ }).click();

  // Go to RNs tab and lock RN 1
  await page.getByRole('link', { name: 'RNs' }).click();
  await page.getByLabel('Lock RN 1').click();
  await expect(page.getByLabel('Unlock RN 1')).toBeVisible();

  // Go to Patients tab and open admission
  await page.getByRole('link', { name: 'Patients' }).click();
  await page.getByRole('button', { name: '+ Admission' }).click();

  await page.getByRole('dialog').getByRole('button', { name: '919' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Only RN2 should appear (RN1 is locked)
  const suggestionButtons = page.getByRole('dialog').locator('button').filter({ hasText: /load/ });
  await expect(suggestionButtons).toHaveCount(1);
  await expect(suggestionButtons.first()).toContainText('RN2');

  await suggestionButtons.first().click();
  await expect(page.getByText('919')).toBeVisible();
});

test('discharge removes patient via action picker', async ({ page }) => {
  await page.goto('/');

  // Setup: 1 RN, 2 rooms
  await page.getByLabel('Increase RN count').click();

  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();
  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /Distribute/ }).click();

  // Navigate to Patients tab
  await page.getByRole('link', { name: 'Patients' }).click();

  // Tap room 915 row to open action picker
  await page.locator('button').filter({ hasText: '915' }).filter({ hasText: 'HIGH' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Tap Discharge in action picker
  await page.getByRole('button', { name: 'Discharge' }).click();

  // Confirm discharge
  await page.getByRole('dialog').getByRole('button', { name: 'Discharge' }).click();

  // Room 915 should no longer show as occupied (should be in empty section or gone)
  await expect(page.locator('button').filter({ hasText: '915' }).filter({ hasText: 'HIGH' })).toHaveCount(0);
});
