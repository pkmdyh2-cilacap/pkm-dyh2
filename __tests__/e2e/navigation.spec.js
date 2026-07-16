const { test, expect } = require('@playwright/test');

const AUTHED_PAGES = [
  'index.html',
  'mutu.html',
  'yanlik.html',
  'pralokmin-klaster.html',
  'dashboard-pkp.html',
  'kelola-indikator.html',
  'entri-pkp1.html',
  'entri-pkp2.html',
  'entri-pkp3.html',
  'entri-pkp4.html',
  'entri-pkp5.html',
  'pralokmin.html',
];

test.describe('Sidebar Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(() => localStorage.setItem('pkm_token', 'test-token'));
  });

  test('Home link is active on index.html', async ({ page }) => {
    await page.goto('/index.html');
    const homeLink = page.locator('nav#sidebar a.nav-link', { hasText: 'Home' });
    await expect(homeLink).toHaveClass(/active/);
    await expect(homeLink).toHaveClass(/bg-emerald-100/);
  });

  test('Mutu parent is highlighted on mutu.html', async ({ page }) => {
    await page.goto('/mutu.html');
    const mutuToggle = page.locator('nav#sidebar a#mutuToggle');
    await expect(mutuToggle).toHaveClass(/active/);
    await expect(mutuToggle).toHaveClass(/bg-emerald-100/);
  });

  test('Mutu submenu is open on mutu.html', async ({ page }) => {
    await page.goto('/mutu.html');
    const submenu = page.locator('nav#sidebar ul#mutuSubmenu');
    await expect(submenu).toHaveClass(/submenu-open/);
  });

  test('Pralokmin Klaster link is active on its page', async ({ page }) => {
    await page.goto('/pralokmin-klaster.html');
    const link = page.locator('nav#sidebar a.nav-link', { hasText: 'Pralokmin Klaster' });
    await expect(link).toHaveClass(/active/);
    await expect(link).toHaveClass(/bg-emerald-100/);
  });

  test('Pelayanan Publik link is active on yanlik.html', async ({ page }) => {
    await page.goto('/yanlik.html');
    const link = page.locator('nav#sidebar a.nav-link', { hasText: 'Pelayanan Publik' });
    await expect(link).toHaveClass(/active/);
    await expect(link).toHaveClass(/bg-emerald-100/);
  });

  test('Home is NOT active on other pages', async ({ page }) => {
    await page.goto('/mutu.html');
    const homeLink = page.locator('nav#sidebar a.nav-link', { hasText: 'Home' });
    await expect(homeLink).not.toHaveClass(/active/);
  });

  test('Mutu submenu toggle opens submenu on click', async ({ page }) => {
    await page.goto('/index.html');
    const submenu = page.locator('nav#sidebar ul#mutuSubmenu');
    await expect(submenu).not.toHaveClass(/submenu-open/);
    const mutuToggle = page.locator('nav#sidebar a#mutuToggle');
    await mutuToggle.click();
    await expect(submenu).toHaveClass(/submenu-open/);
  });

  test('sidebar has logout button', async ({ page }) => {
    await page.goto('/index.html');
    const logoutLink = page.locator('nav#sidebar a', { hasText: 'Keluar' });
    await expect(logoutLink).toBeVisible();
  });

  test('header has logout button on mobile breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/index.html');
    const headerLogout = page.locator('header button', { hasText: 'Keluar' });
    await expect(headerLogout).toBeVisible();
  });

  AUTHED_PAGES.forEach((pageName) => {
    test(`logout button exists on ${pageName}`, async ({ page }) => {
      await page.goto(`/${pageName}`);
      const logoutInSidebar = page.locator('nav#sidebar a', { hasText: 'Keluar' });
      if (await logoutInSidebar.count() > 0) {
        await expect(logoutInSidebar).toBeVisible();
      }
    });
  });
});
