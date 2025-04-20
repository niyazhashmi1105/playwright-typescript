# Playwright TypeScript Test Framework

This repository contains an end-to-end testing framework built with Playwright and TypeScript, featuring BrowserStack integration, comprehensive reporting with Allure, and metrics monitoring using Prometheus and Grafana.

## Features

- TypeScript support
- Cross-browser testing (Chromium, Firefox, WebKit)
- BrowserStack integration for cloud testing
- Allure reporting
- Prometheus metrics
- Grafana dashboards
- GitHub Actions CI/CD integration
- Parallel test execution
- Video recording and screenshot capture

## Prerequisites

- Node.js (LTS version)
- npm (Node Package Manager)
- Docker (for metrics and monitoring)

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Install Playwright browsers:
```bash
npx playwright install --with-deps
```

4. Create a `.env` file in the root directory with your BrowserStack credentials:
```bash
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key
```

## Available Commands

### Local Test Execution
- Run all tests headless:
```bash
npm run all:headless
```

- Run all tests with UI:
```bash
npm run all:ui
```

- Run Chrome-only tests with UI:
```bash
npm run chrome:ui
```

### BrowserStack Test Execution
- Run tests on BrowserStack:
```bash
npm run browserstack-playwright
```

- Execute tests with report generation:
```bash
npm run execute-tests
```

### Reporting
- Generate Allure report:
```bash
npm run allure:generate
```

- Open Allure report:
```bash
npm run allure:open
```

## Project Structure

- `/tests` - Test files
- `/pages` - Page Object Models
- `/fixtures` - Test fixtures and shared configurations
- `/utils` - Utility functions and helpers
- `/testdata` - Test data files
- `/allure-results` - Raw test results
- `/allure-report` - Generated HTML reports
- `/prometheus` - Prometheus configuration
- `/my-report` - Custom test reports

## Configuration Files

- `playwright.config.ts` - Main Playwright configuration
- `browserstack.yml` - BrowserStack configuration
- `.github/workflows/playwright.yml` - GitHub Actions workflow

## Monitoring Setup

The framework includes Prometheus and Grafana integration for test metrics monitoring:

1. Prometheus metrics are exposed on port 9323
2. Grafana dashboards are available on port 3000
3. Metrics are automatically collected during test execution

### Starting the Monitoring Stack
```bash
npm run monitor:start
```
This will:
- Start Prometheus and the test runner containers
- Set up the metrics collection
- Verify the health of both services

### Checking Metrics Status
```bash
npm run monitor:health
```
This will show:
- Metrics server health status
- Current collected metrics
- Prometheus connection status
- Target scraping status

### Viewing Metrics
- Prometheus UI: http://localhost:9090
- Raw metrics: http://localhost:9323/metrics
- Health check: http://localhost:9323/health

### Stopping the Stack
```bash
npm run monitor:stop
```

### Available Metrics
- `playwright_test_total`: Total number of tests executed (labels: status, browser, suite)
- `playwright_test_duration_seconds`: Test execution time (labels: test_name, browser, suite)
- `playwright_test_retries_total`: Number of test retries (labels: test_name, browser)

## CI/CD Integration

The project includes GitHub Actions workflow that:
- Runs tests on push/PR to main/master branches
- Sets up monitoring infrastructure
- Generates and uploads test reports
- Collects and visualizes metrics

## Reports

The framework generates multiple types of reports:
1. Allure Reports - Detailed test execution reports
2. Playwright HTML reports
3. Custom reports in /my-report directory
4. BrowserStack test execution reports

## Browsers and Platforms

Tests can be executed on:
- Local browsers (Chromium, Firefox, WebKit)
- BrowserStack platforms:
  - Windows 10/11
  - macOS Ventura/Sequoia
  - Multiple browser versions
  - Mobile devices (configurable)

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Troubleshooting

- For BrowserStack issues, check browserstack.err log
- For local execution issues, check the test-results directory
- For monitoring issues, verify prometheus/grafana container logs