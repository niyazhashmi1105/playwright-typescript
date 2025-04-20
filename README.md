# Playwright TypeScript Project

## Metrics Monitoring

This project includes Prometheus metrics collection for test execution. Here's how to use it:

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

### GitHub Actions Integration
The metrics collection is automatically configured in GitHub Actions and will run as part of the CI/CD pipeline.