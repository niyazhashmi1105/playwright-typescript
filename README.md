# Playwright Test Automation Framework

This repository contains an end-to-end test automation framework using Playwright with TypeScript, including test metrics collection, monitoring, and reporting capabilities.

## Features

- End-to-end testing using Playwright
- TypeScript support
- Cross-browser testing (Chromium, Firefox, WebKit)
- Test metrics collection with Prometheus
- Metrics visualization with Grafana
- Multiple reporting options:
  - HTML reports
  - Allure reports
  - Ortoni custom reports
- BrowserStack integration
- GitHub Actions CI/CD pipeline

## Prerequisites

- Node.js (LTS version)
- Docker (for running Prometheus and Grafana)
- BrowserStack account (optional, for cross-browser testing)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd playwright-typescript
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

## Environment Setup

1. Create a `.env` file in the project root with the following configurations:
```env
ENV=qa
URL=<your-application-url>
BROWSERSTACK_USERNAME=<your-browserstack-username>
BROWSERSTACK_ACCESS_KEY=<your-browserstack-access-key>
GRAFANA_API_KEY=<your-grafana-api-key>
GRAFANA_URL=http://localhost:3000
```

## Running Tests

### Local Execution

- Run all tests headlessly:
```bash
npm run all:headless
```

- Run tests in Chromium with UI:
```bash
npm run chrome:ui
```

- Run all tests with UI:
```bash
npm run all:ui
```

### BrowserStack Execution

- Run tests on BrowserStack:
```bash
npm run browserstack-playwright
```

- Run with reports:
```bash
npm run execute-tests-browserstack
```

## Test Reports

### HTML Report
- Available after test execution in `playwright-report/` directory
- Access via `npx playwright show-report`

### Allure Report
- Generate report: `npm run allure:generate`
- Open report: `npm run allure:open`

### Ortoni Report
- Available in `my-report/` directory after test execution

## Metrics and Monitoring

### Prometheus Setup
- Metrics exposed on port 9323
- Configure in `prometheus/prometheus.yml`

### Grafana Dashboard
- Access at http://localhost:3000
- Upload dashboard: `npm run upload-dashboard`
- Default credentials: admin/admin

## Docker Containers

The project uses Docker containers for:
- Prometheus (Metrics collection)
- Grafana (Metrics visualization)
- Test execution in CI/CD

## CI/CD Pipeline

GitHub Actions workflow includes:
1. Setting up test environment
2. Installing dependencies
3. Running tests with metrics collection
4. Uploading test results and reports
5. Publishing metrics to Grafana
6. Storing test artifacts

## Project Structure

```
playwright-typescript/
├── fixtures/          # Test fixtures
├── grafana/          # Grafana dashboards
├── pages/            # Page objects
├── prometheus/       # Prometheus configuration
├── scripts/         # Utility scripts
├── tests/           # Test files
├── utils/           # Helper utilities
└── testdata/        # Test data files
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License