import { test, expect } from '@playwright/test';
import { AccessibilityUtils } from '../../utils/accessibility-utils';
import { LoginPage } from '../../pages/loginpage';
import { HomePage } from '../../pages/homepage';
import { CartPage } from '../../pages/cartpage';
import { PasswordUtils } from '../../utils/password-utils';
import * as fs from 'fs';

const testData = JSON.parse(fs.readFileSync(`./testdata/data.json`, `utf-8`));
const decodedPassword = PasswordUtils.decodePassword(testData.password);

test.describe('Shopping Cart WCAG 2.1 AA Compliance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login and add items to cart
    const loginPage = new LoginPage(page);
    const homePage = new HomePage(page);
    
    await loginPage.navigateToURL('https://www.saucedemo.com/');
    await loginPage.doLogin(testData.std_user, decodedPassword);
    
    // Add products to cart
    await homePage.addProductToCart(testData.addProductCart1, '#add-to-cart-sauce-labs-backpack');
    await homePage.addProductToCart(testData.addProductCart2, '#add-to-cart-sauce-labs-bolt-t-shirt');
    
    // Navigate to cart
    await page.click('.shopping_cart_link');
    
    // Verify we're on the cart page
    await expect(page.locator('.cart_list')).toBeVisible();
  });

  test('Cart page should meet WCAG 2.1 AA compliance standards', async ({ page }) => {
    // Run accessibility scan focused on WCAG 2.1 AA standards
    const accessibilityScanResults = await AccessibilityUtils.runAccessibilityScan(page, 'cart-page-accessibility');
    
    // Log any violations for debugging and reporting
    if (accessibilityScanResults.violations.length > 0) {
      console.log('WCAG 2.1 AA violations on cart page:', 
        accessibilityScanResults.violations.map(v => `${v.id} (${v.impact}): ${v.description}`));
    }
    
    // Assert no violations for WCAG 2.1 AA compliance
    expect(accessibilityScanResults.violations.length, 'WCAG 2.1 AA violations found').toBe(0);
  });
  
  test('Cart page should be keyboard navigable per WCAG 2.1 AA requirements', async ({ page }) => {
    // Test keyboard navigation to checkout button
    await page.keyboard.press('Tab'); // Focus on first element
    
    // Keep pressing Tab until we reach the checkout button or exceed a reasonable number of tries
    const maxTabs = 20;
    let checkoutFocused = false;
    
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? {
          id: el.id, 
          textContent: el.textContent?.trim(),
          tagName: el.tagName
        } : null;
      });
      
      if (focusedElement?.id === 'checkout' || 
          (focusedElement?.tagName === 'BUTTON' && 
           focusedElement?.textContent === 'Checkout')) {
        checkoutFocused = true;
        break;
      }
    }
    
    expect(checkoutFocused, 'Checkout button should be focusable with keyboard per WCAG 2.1 AA').toBe(true);
  });
});