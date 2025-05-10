# Playwright Test Automation Framework with Monitoring

This repository contains an end-to-end test automation framework using Playwright with TypeScript, including test metrics collection, monitoring, and reporting capabilities.

## Features

- End-to-end testing using Playwright
- TypeScript support
- Cross-browser testing (Chromium, Firefox, WebKit)
- Test metrics collection with Prometheus
- Metrics visualization with Grafana
- Alerting with AlertManager
- Jenkins integration for CI/CD
- Multiple reporting options:
  - HTML reports
  - Allure reports
  - Custom reports
- BrowserStack integration
- Email notifications for test results

## Prerequisites

- Node.js (v18 or later)
- Docker and Docker Compose
- Jenkins (for CI/CD)
- BrowserStack account (optional, for cross-browser testing)
- Gmail account (for email notifications)

## Framework Architecture

```
playwright-typescript/
├── alertmanager/        # AlertManager configuration
├── allure-report/       # Allure report output
├── allure-results/      # Allure test results
├── fixtures/            # Test fixtures for page objects
├── grafana/             # Grafana dashboards and configuration
│   └── dashboards/      # Dashboard JSON files
├── jenkins/             # Jenkins configuration
├── my-report/           # Custom report output
├── pages/               # Page object models
├── playwright-report/   # Playwright HTML report output
├── prometheus/          # Prometheus configuration
├── scripts/             # Utility scripts
│   ├── post-test.js     # Post-test metrics collection
│   └── upload-dashboard.js # Dashboard uploader
├── test-results/        # Test execution results
├── testdata/            # Test data files
├── tests/               # Test spec files
└── utils/               # Helper utilities
    ├── email-utils.js   # Email notification utilities
    └── grafana-utils.js # Grafana API utilities
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
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=admin
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
JENKINS_USER=admin
JENKINS_TOKEN=admin
CI=false  # Set to true in CI environments
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

Key configuration points:
- Jenkins metrics are scraped from the `/prometheus` endpoint
- Playwright test metrics are collected from a custom metrics exporter
- Scrape interval is set to 15 seconds

### 5. Grafana Setup

#### Dashboard Configuration

1. Access Grafana at http://localhost:3002 (default credentials: admin/admin)
2. Upload the dashboard:
   ```bash
   npm run upload-dashboard
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
   - Configure Prometheus endpoints

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

### 8. Running Tests

#### Local Execution

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

#### BrowserStack Execution

- Run tests on BrowserStack:
```bash
npm run browserstack-playwright
```

### 9. Test Reports and Metrics

After test execution, you can:

1. View HTML report:
```bash
npx playwright show-report
```

2. View Allure report:
```bash
npm run allure:open
```

3. Check metrics in Grafana dashboard:
   - Go to http://localhost:3002
   - Navigate to the Playwright Dashboard

4. Check test metrics directly:
```bash
curl http://localhost:9091/metrics
```

### 10. Email Notifications

Email notifications are sent automatically:

1. Upon test completion through `post-test.js` script
2. When test failures occur through AlertManager alerts
3. For critical failures via Jenkins email notifications

#### Gmail App Password Setup

1. Enable 2-Step Verification in your Google Account
2. Generate an App Password:
   - Go to Google Account Settings > Security
   - Under "Signing in to Google" find App Passwords
   - Select "Mail" and your device
   - Use the generated 16-character password in your .env file

## Troubleshooting

### Common Issues and Solutions

1. **Monitoring connection issues:**
   - Ensure Docker containers are running: `docker-compose ps`
   - Check container logs: `docker-compose logs prometheus`
   - Verify network connectivity between containers

2. **Email notification failures:**
   - Verify SMTP settings in .env file
   - Check if app password is correct for Gmail
   - Review logs for email sending errors

3. **Jenkins integration problems:**
   - Ensure Jenkins container can reach other services
   - Verify Jenkins has required plugins installed
   - Check Jenkins pipeline execution logs

4. **Test failure alerts not triggering:**
   - Verify AlertManager configuration
   - Check Prometheus targets are up
   - Review alert rules in Grafana

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License