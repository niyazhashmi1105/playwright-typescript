"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
const reportConfig = {
    open: process.env.CI ? "never" : "never", // default to never
    folderPath: "my-report",
    filename: "index.html",
    logo: "logo.{png, jpg}",
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
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
/**
 * See https://playwright.dev/docs/test-configuration.
 */
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    timeout: 60 * 1000,
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['html'],
        ['allure-playwright', {
                outputFolder: 'allure-results',
                detail: true,
                suiteTitle: true
            }],
        ['./utils/prometheus-reporter.ts'],
        ["ortoni-report", reportConfig],
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        // baseURL: 'http://127.0.0.1:3000',
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'on',
        video: "on"
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            //use: { ...devices['Desktop Chrome'] },
            use: { browserName: 'chromium' },
        },
        {
            name: 'firefox',
            //use: { ...devices['Desktop Firefox'] },
            use: { browserName: 'firefox' },
        },
        {
            name: 'webkit',
            // use: { ...devices['Desktop Safari'] },
            use: { browserName: 'webkit' },
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
        // {
        //   name: 'Microsoft Edge',
        //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
        // },
        // {
        //   name: 'Google Chrome',
        //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        // },
        /* Run your local dev server before starting the tests */
        // webServer: {
        //   command: 'npm run start',
        //   url: 'http://127.0.0.1:3000',
        //   reuseExistingServer: !process.env.CI,
        // },
    ]
});
