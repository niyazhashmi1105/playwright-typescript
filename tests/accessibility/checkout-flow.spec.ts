import { test, expect } from '@playwright/test';
import { AccessibilityUtils } from '../../utils/accessibility-utils';
import { LoginPage } from '../../pages/loginpage';
import { HomePage } from '../../pages/homepage';
import { CartPage } from '../../pages/cartpage';
import { PasswordUtils } from '../../utils/password-utils';
import * as fs from 'fs';

const testData = JSON.parse(fs.readFileSync(`./testdata/data.json`, `utf-8`));
const decodedPassword = PasswordUtils.decodePassword(testData.password);

test.describe('Checkout Flow WCAG 2.1 AA Compliance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login, add items to cart, and navigate to checkout
    const loginPage = new LoginPage(page);
    const homePage = new HomePage(page);
    const cartPage = new CartPage(page);
    
    await loginPage.navigateToURL('https://www.saucedemo.com/');
    await loginPage.doLogin(testData.std_user, decodedPassword);
    
    // Add a product to cart
    await homePage.addProductToCart(testData.addProductCart1, '#add-to-cart-sauce-labs-backpack');
    
    // Go to cart
    await page.click('.shopping_cart_link');
    
    // Proceed to checkout
    await cartPage.click('#checkout');
    
    // Verify we're on the checkout page
    await expect(page.locator('#checkout_info_container')).toBeVisible();
  });

  test('Checkout information form should meet WCAG 2.1 AA standards', async ({ page }) => {
    // Run accessibility scan on the checkout information page
    const checkoutFormResults = await AccessibilityUtils.runAccessibilityScan(page, 'checkout-information-form');
    
    // Log any violations for debugging and reporting
    if (checkoutFormResults.violations.length > 0) {
      console.log('WCAG 2.1 AA violations on checkout form:', 
        checkoutFormResults.violations.map(v => `${v.id} (${v.impact}): ${v.description}`));
    }
    
    // Assert no violations for WCAG 2.1 AA compliance
    expect(checkoutFormResults.violations.length, 'WCAG 2.1 AA violations found').toBe(0);
  });
  
  test('Form fields should have explicit labels per WCAG 2.1 AA requirements', async ({ page }) => {
    // Check if input fields have properly associated labels (WCAG 2.1 AA requirement)
    const formFields = ['#first-name', '#last-name', '#postal-code'];
    
    for (const fieldSelector of formFields) {
      const field = page.locator(fieldSelector);
      const fieldId = await field.getAttribute('id');
      
      if (!fieldId) {
        console.log(`Field ${fieldSelector} doesn't have an ID attribute`);
        continue;
      }
      
      // Check for explicit label using for attribute
      const hasExplicitLabel = await page.locator(`label[for="${fieldId}"]`).count() > 0;
      
      // Check for implicit label (field is wrapped in a label)
      const hasImplicitLabel = await page.evaluate((elementId) => {
        const field = document.getElementById(elementId);
        return field ? field.closest('label') !== null : false;
      }, fieldId);
      
      // Check for aria-label or aria-labelledby
      const hasAriaLabel = await field.getAttribute('aria-label') !== null || 
                         await field.getAttribute('aria-labelledby') !== null;
      
      expect(
        hasExplicitLabel || hasImplicitLabel || hasAriaLabel, 
        `Field ${fieldId} should have an accessible label per WCAG 2.1 AA`
      ).toBe(true);
    }
  });
  
  test('Complete checkout flow should be keyboard accessible per WCAG 2.1 AA', async ({ page }) => {
    const cartPage = new CartPage(page);
    
    // Fill checkout information using keyboard only
    await page.keyboard.press('Tab'); // Focus on first name field
    await page.keyboard.type('Test');
    
    await page.keyboard.press('Tab'); // Last name field
    await page.keyboard.type('User');
    
    await page.keyboard.press('Tab'); // Postal code field
    await page.keyboard.type('12345');
    
    await page.keyboard.press('Tab'); // Continue button
    await page.keyboard.press('Enter');
    
    // Check if we reached the checkout overview page
    await expect(page.locator('.checkout_summary_container')).toBeVisible();
    
    // Check the checkout overview page for WCAG 2.1 AA compliance
    const overviewResults = await AccessibilityUtils.runAccessibilityScan(page, 'checkout-overview');
    expect(overviewResults.violations.length, 'WCAG 2.1 AA violations on checkout overview').toBe(0);
    
    // Complete order using keyboard
    await page.keyboard.press('Tab'); 
    await page.keyboard.press('Tab'); // Navigate to finish button
    await page.keyboard.press('Enter');
    
    // Verify order completion
    await expect(page.locator('.complete-header')).toBeVisible();
    
    // Final WCAG 2.1 AA compliance check on order confirmation
    const confirmationResults = await AccessibilityUtils.runAccessibilityScan(page, 'order-confirmation');
    expect(confirmationResults.violations.length, 'WCAG 2.1 AA violations on order confirmation').toBe(0);
  });
});