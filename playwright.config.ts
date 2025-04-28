import { defineConfig, devices } from '@playwright/test';
import { OrtoniReportConfig } from "ortoni-report";
import path from 'path';
import dotenv from 'dotenv';

// Load .env file only in non-CI environment
if (!process.env.CI) {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
}

// Set default metrics port if not specified
process.env.METRICS_PORT = process.env.METRICS_PORT || '9323';

// Get environment variables with fallbacks
const getEnvVariable = (key: string): string => {
  return process.env[key] || '';
};

const reportConfig: OrtoniReportConfig = {
  open: process.env.CI ? "never" : "never", // default to never
  folderPath: "my-report",
  filename: "index.html",
  logo:"logo.{png, jpg}",
  title: "Ortoni Test Report",
  showProject: false,
  projectName: "Ortoni-Report",
  testType: "e2e",
  authorName: "Niyaz",
  base64Image: false,
  stdIO: false,
  preferredTheme: "light",

  meta: {
    project: "Playwright",
    version: "3.0.0",
    description: "Playwright test report",
    testCycle: "1",
    release: "1.0.0",
    platform: "MacOS",
  },
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'],
    ['allure-playwright'],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['./utils/email-reporter.ts'],
    ['./utils/prometheus-reporter.ts']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot:'only-on-failure',
    //video:"on",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use:{browserName:'chromium'},
    },

    {
      name: 'firefox',
      use:{browserName:'firefox'},
    },

    {
      name: 'webkit',
      use:{browserName:'webkit'},
    },
    
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
       name: 'Google Chrome',
       use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ]
});
