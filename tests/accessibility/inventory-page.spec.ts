import { test, expect } from '@playwright/test';
import { AccessibilityUtils } from '../../utils/accessibility-utils';
import { LoginPage } from '../../pages/loginpage';
import { HomePage } from '../../pages/homepage';
import { PasswordUtils } from '../../utils/password-utils';
import * as fs from 'fs';

const testData = JSON.parse(fs.readFileSync(`./testdata/data.json`, `utf-8`));
const decodedPassword = PasswordUtils.decodePassword(testData.password);

test.describe('Inventory Page WCAG 2.1 AA Compliance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.navigateToURL('https://www.saucedemo.com/');
    await loginPage.doLogin(testData.std_user, decodedPassword);
    
    // Verify we're on the inventory page
    await expect(page.locator('.inventory_list')).toBeVisible();
  });

  test('Inventory page should comply with WCAG 2.1 AA standards', async ({ page }) => {
    // Run accessibility scan on the inventory page
    const accessibilityScanResults = await AccessibilityUtils.runAccessibilityScan(page, 'inventory-page-accessibility');
    
    // Log any violations for debugging and reporting
    if (accessibilityScanResults.violations.length > 0) {
      console.log('WCAG 2.1 AA violations on inventory page:', 
        accessibilityScanResults.violations.map(v => `${v.id} (${v.impact}): ${v.description}`));
    }
    
    // Assert no violations for WCAG 2.1 AA compliance
    expect(accessibilityScanResults.violations.length, 'WCAG 2.1 AA violations found').toBe(0);
  });
  
  test('Color contrast should meet WCAG 2.1 AA standards', async ({ page }) => {
    // Run specific contrast check (this is a key requirement of WCAG 2.1 AA)
    // We're only checking for color-contrast rule, not limiting to a specific selector
    const contrastResults = await AccessibilityUtils.runCustomScan(page, {
      includedRules: ['color-contrast'],
      testName: 'inventory-color-contrast'
    });
    
    // Check for contrast violations
    const contrastViolations = contrastResults.violations.filter(v => v.id === 'color-contrast');
    
    if (contrastViolations.length > 0) {
      console.log('Contrast violations:', contrastViolations[0].nodes.map(n => n.html));
    }
    
    expect(contrastViolations.length, 'Color contrast violations found').toBe(0);
  });
  
  test('Filter dropdown accessibility', async ({ page }) => {
    const homePage = new HomePage(page);
    
    // First verify the filter dropdown exists
    await expect(page.locator('.product_sort_container')).toBeVisible();
    
    // Run specific accessibility scan on the filter dropdown
    const filterResults = await AccessibilityUtils.runCustomScan(page, {
      selector: '.product_sort_container',
      testName: 'product-filter-dropdown'
    });
    
    // Log any dropdown-specific violations
    if (filterResults.violations.length > 0) {
      console.log('Filter dropdown accessibility issues:',
        filterResults.violations.map(v => `${v.id} (${v.impact}): ${v.description}`));
    }
    
    // Focus on critical and serious issues
    const criticalIssues = filterResults.violations.filter(v => 
      v.impact === 'critical' || v.impact === 'serious');
    
    expect(criticalIssues.length, 'Critical/serious accessibility issues in filter dropdown').toBe(0);
  });
});