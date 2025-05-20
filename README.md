# Playwright Test Automation Framework with Monitoring

This repository contains an end-to-end test automation framework using Playwright with TypeScript, including test metrics collection, monitoring, and reporting capabilities.

## Features

- End-to-end testing using Playwright with TypeScript
- Cross-browser testing (Chromium, Firefox, WebKit)
- API testing capabilities
- Accessibility testing integration with Axe-core
- Test data generation with Faker.js
- Test metrics collection with Prometheus
- Metrics visualization with Grafana dashboards
- Real-time alerting with AlertManager
- Jenkins integration for CI/CD pipelines
- Docker containerization for monitoring stack
- Multiple reporting options:
  - HTML reports (built-in Playwright)
  - Allure reports with detailed test steps
  - Custom Ortoni reports
  - JSON reports for data processing
  - Email reporting for stakeholder updates
- BrowserStack integration for cross-platform testing
- Test parallelization and sharding
- Environment-specific configurations using dotenv
- Custom test retries and failure handling
- Video recording and screenshot capture on failures

## Prerequisites

- Node.js (v18 or later)
- Docker and Docker Compose
- Jenkins (for CI/CD)
- BrowserStack account (optional, for cross-browser testing)
- Gmail account (for email notifications)

## Framework Architecture

```
playwright-typescript/
├── alertmanager/             # AlertManager configuration
│   ├── alertmanager.yml      # Alert routing and receiver configuration
│   └── email.tmpl            # Email alert templates
├── allure-report/            # Generated Allure report output
├── allure-results/           # Raw Allure test results
├── fixtures/                 # Test fixtures for page objects
├── grafana/                  # Grafana dashboards and configuration
│   └── dashboards/           # Dashboard JSON definitions
├── jenkins/                  # Jenkins configuration files
├── log/                      # Test execution logs
├── my-report/                # Custom Ortoni report output
├── pages/                    # Page object models
├── playwright-report/        # Playwright HTML report output
├── prometheus/               # Prometheus monitoring configuration
├── scripts/                  # Utility scripts
│   ├── post-test.js          # Post-test metrics collection
│   └── upload-dashboard.js   # Grafana dashboard uploader
├── test-results/             # Test execution results (JSON format)
├── testdata/                 # Test data files
├── tests/                    # Test spec files
│   ├── api/                  # API test specs
│   └── ui/                   # UI test specs 
├── utils/                    # Helper utilities
│   ├── email-reporter.ts     # Custom email reporter
│   ├── prometheus-reporter.ts# Metrics reporter for Prometheus
│   ├── email-utils.js        # Email notification utilities
│   └── grafana-utils.js      # Grafana API utilities
├── .env                      # Environment configuration
├── global-setup.ts           # Global test setup functions
├── global-teardown.ts        # Global test teardown functions
├── playwright.config.ts      # Playwright configuration
├── tsconfig.json             # TypeScript configuration
├── docker-compose.yml        # Docker services configuration
├── docker-compose.override.yml # Docker override configuration
├── azure-pipelines.yml       # Azure DevOps pipeline configuration
├── browserstack.yml          # BrowserStack configuration
├── fixed-prometheus-init.groovy # Jenkins Prometheus initialization script
└── browserstack-jenkins-config.json # BrowserStack Jenkins integration
```

## Detailed Setup Guide

### 1. Initial Setup

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

### 2. Environment Configuration

Create a `.env` file in the root directory with the following configurations:

```env
# Test Environment
ENV=qa
URL=<your-application-url>

# BrowserStack Integration
BROWSERSTACK_USERNAME=<your-browserstack-username>
BROWSERSTACK_ACCESS_KEY=<your-browserstack-access-key>

# Grafana Configuration
GF_SECURITY_ADMIN_USER=<GRAFANA_USERNAME>
GF_SECURITY_ADMIN_PASSWORD=<GRAFANA_PASSWORD>
GRAFANA_URL=http://localhost:3002

# Email Notification Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Test Automation Reports
SMTP_TO=recipient@example.com

# Jenkins Configuration
JENKINS_USER=<JENKINS_USERNAME>
JENKINS_TOKEN=<JENKINS_TOKEN>
CI=false  # Set to true in CI environments

# Metrics Configuration
METRICS_PORT=9324
```

### 3. Monitoring Stack Setup

To set up the complete monitoring stack (Prometheus, Grafana, AlertManager, and Jenkins):

```bash
docker-compose up -d
```

This will start the following services:
- Jenkins: http://localhost:8080
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002
- AlertManager: http://localhost:9093
- Metrics Exporter: http://localhost:9091/metrics

### 4. Prometheus Configuration

The Prometheus configuration is in `prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'jenkins'
    metrics_path: '/prometheus'
    static_configs:
      - targets: ['jenkins:8080']

  - job_name: 'playwright-metrics'
    static_configs:
      - targets: ['metrics-exporter:9091']
```

The Jenkins Prometheus integration is configured through `fixed-prometheus-init.groovy`, which sets up:
- Default namespace: "jenkins"
- Metrics endpoint: "/prometheus"
- No authentication required for the endpoint
- Metrics collection period: 120 seconds

### 5. Grafana Setup

#### Dashboard Configuration

1. Access Grafana at http://localhost:3002 (default credentials: admin/admin)
2. Upload the dashboard:
   ```bash
   npm run upload:dashboard
   ```
   or manually import from `grafana/dashboards/consolidated-dashboard.json`

3. Configure Prometheus as a data source:
   - Go to Configuration > Data sources
   - Add Prometheus data source
   - URL: http://prometheus:9090
   - Save & Test

#### Alert Configuration

1. Configure alert channels in Grafana:
   - Go to Alerting > Contact points
   - Add "Email" contact point using the SMTP settings from .env

2. Create alert rules:
   - Go to Alerting > Alert Rules
   - Create rule for test failures by setting threshold on `playwright_tests_failed` metric

### 6. AlertManager Configuration

AlertManager is configured in `alertmanager/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m
  smtp_from: 'your-email@gmail.com'
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'
  smtp_require_tls: true

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email'

receivers:
- name: 'email'
  email_configs:
  - to: 'recipient@example.com'
    html: '{{ template "email.html" . }}'
```

Email templates are defined in `alertmanager/email.tmpl` for customizing notification emails.

### 7. Jenkins Setup

#### Jenkins Configuration

1. Access Jenkins at http://localhost:8080 (default credentials: admin/admin)
2. Install required plugins:
   - Playwright
   - Allure
   - Blue Ocean
   - Prometheus metrics

3. Configure Jenkins:
   - Navigate to Manage Jenkins > Configure System
   - Configure Global properties, including environment variables
   - Configure Prometheus endpoints through the fixed-prometheus-init.groovy script

#### Creating a Jenkins Job

1. Create a new Pipeline job:
   - New Item > Pipeline
   - Pipeline script from SCM
   - SCM: Git
   - Repository URL: (your repository URL)
   - Script Path: Jenkinsfile

2. Configure build triggers:
   - Poll SCM: `H/15 * * * *` (every 15 minutes)
   - Or set up webhook triggers

3. The Jenkinsfile should contain:
   ```groovy
   pipeline {
       agent {
           docker {
               image 'mcr.microsoft.com/playwright:v1.40.0-focal'
               args '--network=playwright-typescript_monitoring-network'
           }
       }
       environment {
           CI = 'true'
       }
       stages {
           stage('Install Dependencies') {
               steps {
                   sh 'npm ci'
               }
           }
           stage('Run Tests') {
               steps {
                   sh 'npx playwright test'
               }
           }
           stage('Generate Reports') {
               steps {
                   sh 'npm run allure:generate'
               }
           }
           stage('Post-Test Monitoring') {
               steps {
                   sh 'node scripts/post-test.js'
               }
           }
       }
       post {
           always {
               publishHTML([
                   allowMissing: false,
                   alwaysLinkToLastBuild: true,
                   keepAll: true,
                   reportDir: 'playwright-report',
                   reportFiles: 'index.html',
                   reportName: 'Playwright Report'
               ])
               allure([
                   reportBuildPolicy: 'ALWAYS',
                   results: [[path: 'allure-results']]
               ])
           }
       }
   }
   ```

### 8. BrowserStack Integration

The framework includes BrowserStack integration for cross-browser and cross-platform testing.

#### Configuration

BrowserStack configuration is in `browserstack.yml` and can be customized for different browser/OS combinations:

```yaml
# browserstack.yml
buildName: "Playwright Tests - Build #123"
projectName: "My Project"
browserstackLocal: true
sessionName: "Testing Session"
debug: true
networkLogs: true
consoleLogs: errors
browsers:
  - browser: chrome
    os: Windows
    osVersion: 11
  - browser: firefox
    os: Windows  
    osVersion: 10
  - browser: safari
    os: OS X
    osVersion: Ventura
  - browser: edge
    os: Windows
    osVersion: 11
```

#### Running Tests on BrowserStack

```bash
npm run browserstack:playwright
# or
npm run chrome:ui-browserstack
```

### 9. Running Tests

#### Local Test Execution

- Run all tests headlessly:
```bash
npm run all:headless
```

- Run all tests with UI:
```bash
npm run all:ui
```

- Run tests in specific browsers:
```bash
npm run chrome:headless
```

- Run API tests only:
```bash
npm run test:api
```

- Run UI tests only:
```bash
npm run test:ui
```

- Run all tests (API and UI):
```bash
npm run test:all
```

#### BrowserStack Execution

- Run tests on BrowserStack:
```bash
npm run browserstack:playwright
```

### 10. Reporting Options

The framework includes multiple reporting options:

#### Playwright HTML Report

```bash
npm run show:report
```

#### Allure Report

To generate and view Allure reports:

```bash
# Generate report
npx allure generate allure-results -o allure-report --clean

# Open report
npx allure open allure-report
```

#### Custom Ortoni Report

Configured in `playwright.config.ts` with customizable options:
- Custom branding with logo
- Test metadata
- Light/dark theme options
- Author information
- Platform details

#### Email Reports

Automatically sent after test runs through the custom email reporter:
- Test summary statistics
- Pass/fail details
- Environment information
- Execution time

### 11. Test Metrics

After test execution, metrics are available via:

1. Prometheus endpoint:
```bash
curl http://localhost:9091/metrics
```

2. Grafana dashboard (http://localhost:3002)

Key metrics include:
- Test counts (total, passed, failed, skipped)
- Test duration statistics
- Flaky test identification
- Browser-specific failures
- API/UI test breakdown

### 12. Accessibility Testing

The framework includes accessibility testing capabilities using Axe-core:

```typescript
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page should be accessible', async ({ page }) => {
  await page.goto('https://your-site.com');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### 13. API Testing

For API tests, the framework provides utilities for:

- REST API requests
- JSON schema validation
- Authentication handling
- Response time measurements
- Custom assertions

Example API test:

```typescript
import { test, expect } from '@playwright/test';

test('API should return user data', async ({ request }) => {
  const response = await request.get('https://api.example.com/users/1');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('id');
  expect(body).toHaveProperty('name');
});
```

## Troubleshooting

### Common Issues and Solutions

1. **Monitoring connection issues:**
   - Ensure Docker containers are running: `docker-compose ps`
   - Check container logs: `docker-compose logs prometheus`
   - Verify network connectivity between containers
   - Check METRICS_PORT environment variable is set correctly

2. **Email notification failures:**
   - Verify SMTP settings in .env file
   - Check if app password is correct for Gmail
   - Review logs for email sending errors

3. **Jenkins integration problems:**
   - Ensure Jenkins container can reach other services
   - Verify Jenkins has required plugins installed
   - Check Jenkins pipeline execution logs
   - Verify the Prometheus endpoint is correctly configured via the groovy script

4. **Test failure alerts not triggering:**
   - Verify AlertManager configuration
   - Check Prometheus targets are up
   - Review alert rules in Grafana

5. **BrowserStack connectivity issues:**
   - Check BrowserStack credentials in .env file
   - Verify BrowserStack local testing connection
   - Review browserstack-node-sdk logs

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License