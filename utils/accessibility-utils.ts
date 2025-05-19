import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Utility class for accessibility testing functions focusing on WCAG 2.1 AA compliance
 */
export class AccessibilityUtils {
  /**
   * Run WCAG 2.1 AA compliance scan on the current page
   * @param page - Playwright page object
   * @param testName - Name of the test for reporting
   * @returns accessibility scan results
   */
  static async runAccessibilityScan(page: Page, testName: string) {
    // Create the AxeBuilder with only WCAG 2.1 AA standards
    const axeBuilder = new AxeBuilder({ page })
      .withTags(['wcag21aa']);
    
    try {
      const accessibilityScanResults = await axeBuilder.analyze();
      
      // Save results to a file for reporting
      const resultsDir = path.join(process.cwd(), 'test-results', 'accessibility');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      const fileName = `${testName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
      fs.writeFileSync(
        path.join(resultsDir, fileName),
        JSON.stringify(accessibilityScanResults, null, 2)
      );
      
      return accessibilityScanResults;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error running accessibility scan: ${error.message}`);
      } else {
        console.error('An unknown error occurred during accessibility scan');
      }
      throw error;
    }
  }

  /**
   * Run custom WCAG 2.1 AA compliance scan with specific options
   * @param page - Playwright page object
   * @param options - Configuration options for the scan
   * @returns accessibility scan results
   */
  static async runCustomScan(
    page: Page, 
    options: {
      includedImpacts?: ('minor' | 'moderate' | 'serious' | 'critical')[];
      includedRules?: string[];
      excludedRules?: string[];
      selector?: string;
      testName?: string;
    } = {}
  ) {
    // Always use WCAG 2.1 AA tag for compliance testing
    let axeBuilder = new AxeBuilder({ page }).withTags(['wcag21aa']);
    
    // Apply custom options if provided
    if (options.includedRules && options.includedRules.length > 0) {
      axeBuilder = axeBuilder.include(options.includedRules);
    }
    
    if (options.excludedRules && options.excludedRules.length > 0) {
      axeBuilder = axeBuilder.exclude(options.excludedRules);
    }
    
    // Only add the selector if it's actually present on the page
    if (options.selector) {
      try {
        const selectorExists = await page.locator(options.selector).count() > 0;
        if (selectorExists) {
          // For element selectors, we need to ensure they exist before we scan them
          const elementHandle = await page.$(options.selector);
          if (elementHandle) {
            axeBuilder = axeBuilder.include(options.selector);
          }
        }
      } catch (error) {
        console.warn(`Selector "${options.selector}" is invalid or not found on page. Scanning entire page instead.`);
      }
    }
    
    // Apply result types filter if impact levels specified
    if (options.includedImpacts && options.includedImpacts.length > 0) {
      axeBuilder = axeBuilder.options({ 
        resultTypes: ['violations']
      });
    }
    
    try {
      const results = await axeBuilder.analyze();
      
      // If impact levels were specified, filter the results
      if (options.includedImpacts && options.includedImpacts.length > 0) {
        results.violations = results.violations.filter(violation => 
          options.includedImpacts?.includes(violation.impact as any)
        );
      }
      
      // Save results if test name is provided
      if (options.testName) {
        const resultsDir = path.join(process.cwd(), 'test-results', 'accessibility');
        if (!fs.existsSync(resultsDir)) {
          fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        const fileName = `${options.testName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
        fs.writeFileSync(
          path.join(resultsDir, fileName),
          JSON.stringify(results, null, 2)
        );
      }
      
      return results;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error running custom accessibility scan: ${error.message}`);
      } else {
        console.error('An unknown error occurred during custom accessibility scan');
      }
      throw error;
    }
  }
}