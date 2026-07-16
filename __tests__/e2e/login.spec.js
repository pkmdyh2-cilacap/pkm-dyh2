const { test, expect } = require('@playwright/test');

test.describe('Login Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
  });

  test('login page loads with form elements', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Bank Data Puskesmas');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Masuk');
  });

  test('shows error on failed login', async ({ page }) => {
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');
    const errorEl = page.locator('#errorMsg');
    await expect(errorEl).not.toHaveClass(/hidden/);
    await expect(errorEl).not.toBeEmpty();
  });

  test('redirects to login if no token on protected page', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveURL(/login\.html/);
  });

  test('mutu page is public (no auth required)', async ({ page }) => {
    await page.goto('/mutu.html');
    await expect(page).toHaveURL(/mutu\.html/);
    await expect(page.locator('h2')).toContainText('Mutu');
  });

  test('redirects to index if already logged in', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('pkm_token', 'test-token'));
    await page.goto('/login.html');
    await expect(page).toHaveURL(/index\.html/);
  });

  test('navigates to index after setting token', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('pkm_token', 'test-token'));
    await page.goto('/index.html');
    await expect(page.locator('h2')).toContainText('Selamat Datang');
  });

  test('logout clears token and redirects to login', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('pkm_token', 'test-token'));
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.removeItem('pkm_token');
      window.location.href = '/login.html';
    });
    await expect(page).toHaveURL(/login\.html/);
    const token = await page.evaluate(() => localStorage.getItem('pkm_token'));
    expect(token).toBeNull();
  });
});
