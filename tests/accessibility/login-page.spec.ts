import { AccessibilityUtils } from '../../utils/accessibility-utils';
import { LoginPage } from '../../pages/loginpage';
import { PasswordUtils } from '../../utils/password-utils';
import * as fs from 'fs';
import { test, expect } from '@playwright/test';

const testData = JSON.parse(fs.readFileSync(`./testdata/data.json`, `utf-8`));
const decodedPassword = PasswordUtils.decodePassword(testData.password);

test.describe('Login Page WCAG 2.1 AA Compliance Tests', () => {
  test('Login page should be WCAG 2.1 AA compliant', async ({ page }) => {
    // Arrange - Navigate to login page
    const loginPage = new LoginPage(page);
    await loginPage.navigateToURL('https://www.saucedemo.com/');
    
    // Assert - Page should not have WCAG 2.1 AA violations
    const accessibilityScanResults = await AccessibilityUtils.runAccessibilityScan(page, 'login-page-accessibility');
    
    // Log any violations for debugging and reporting
    if (accessibilityScanResults.violations.length > 0) {
      console.log('WCAG 2.1 AA violations found:', accessibilityScanResults.violations.map(v => 
        `${v.id} (${v.impact}): ${v.description}`
      ));
    }
    
    // Assert no violations for WCAG 2.1 AA compliance
    expect(accessibilityScanResults.violations.length, 'WCAG 2.1 AA violations found').toBe(0);
  });
  
  test('Login form should be accessible by keyboard', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.navigateToURL('https://www.saucedemo.com/');
    
    // Act - Test keyboard accessibility
    await page.keyboard.press('Tab'); // Focus on username field
    await expect(page.locator('#user-name')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Focus on password field
    await expect(page.locator('#password')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Focus on login button
    await expect(page.locator('#login-button')).toBeFocused();
    
    // Fill and submit the form using keyboard
    await page.keyboard.press('Shift+Tab'); // Back to password
    await page.keyboard.press('Shift+Tab'); // Back to username
    await page.keyboard.type(testData.std_user);
    await page.keyboard.press('Tab');
    await page.keyboard.type(decodedPassword);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Submit the form
    
    // Assert - Verify login success
    await expect(page.locator('.inventory_list')).toBeVisible();
  });
});