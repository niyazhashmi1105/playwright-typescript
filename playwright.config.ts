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

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 0,
  workers: process.env.CI ? 3 : 3,
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'results.xml' }],
    ['allure-playwright'],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['./utils/email-reporter.ts'],
    ['./utils/prometheus-reporter.ts']
  ],
  globalSetup: './global-setup',
  globalTeardown: './global-teardown',
  use: {
    trace: 'on-first-retry',
    screenshot:'only-on-failure',
  },
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
  ],
});
