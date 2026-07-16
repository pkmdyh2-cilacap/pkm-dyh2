const { test, expect } = require('@playwright/test');

const PUBLIC_PAGES = [
  { path: 'login.html', title: 'Login - Puskesmas Dayeuhluhur II' },
  { path: 'mutu.html', title: 'Mutu - Puskesmas Dayeuhluhur II' },
  { path: 'yanlik.html', title: 'Yanlik - Puskesmas Dayeuhluhur II' },
];

const AUTH_PAGES = [
  { path: 'index.html', title: 'Puskesmas Dayeuhluhur II' },
  { path: 'pralokmin-klaster.html', title: 'Pralokmin' },
  { path: 'dashboard-pkp.html', title: 'Dashboard PKP' },
  { path: 'kelola-indikator.html', title: 'Kelola Indikator' },
  { path: 'entri-pkp1.html', title: 'Klaster 1' },
  { path: 'entri-pkp2.html', title: 'Klaster 2' },
  { path: 'entri-pkp3.html', title: 'Klaster 3' },
  { path: 'entri-pkp4.html', title: 'Klaster 4' },
  { path: 'entri-pkp5.html', title: 'Klaster 5' },
  { path: 'pralokmin.html', title: 'Pralokmin' },
];

test.describe('Smoke Test - Public Pages', () => {
  PUBLIC_PAGES.forEach(({ path, title }) => {
    test(`GET /${path} loads with correct title`, async ({ page }) => {
      const response = await page.goto(`/${path}`);
      expect(response.status()).toBe(200);
      await expect(page).toHaveTitle(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    });
  });
});

test.describe('Smoke Test - Auth Pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(() => localStorage.setItem('pkm_token', 'test-token'));
  });

  AUTH_PAGES.forEach(({ path, title }) => {
    test(`GET /${path} loads with correct title`, async ({ page }) => {
      const response = await page.goto(`/${path}`);
      expect(response.status()).toBe(200);
      await expect(page).toHaveTitle(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    });
  });
});

test.describe('Smoke Test - 404', () => {
  test('GET /nonexistent-page returns 404', async ({ page }) => {
    const response = await page.goto('/nonexistent-page.html');
    expect(response.status()).toBe(404);
  });
});
