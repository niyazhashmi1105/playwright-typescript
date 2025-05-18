const axios = require('axios');

class GrafanaUtils {
    static async triggerAlert(metrics) {
        try {
            // Use Docker service name when in CI environment
            const grafanaUrl = process.env.CI ? 'http://grafana:3000' : 'http://localhost:3002';
            const alertmanagerUrl = process.env.CI ? 'http://alertmanager:9093' : 'http://localhost:9093';
            
            // Get authentication details for Grafana
            const grafanaUser = process.env.GF_SECURITY_ADMIN_USER || 'admin';
            const grafanaPassword = process.env.GF_SECURITY_ADMIN_PASSWORD || 'admin';
            // Add Grafana API key for CI environment
            const grafanaApiKey = process.env.GRAFANA_API_KEY;

            console.log('Connecting to Grafana at:', grafanaUrl);

            // Create alert payload with detailed test information
            const alertPayload = {
                testMetrics: {
                    summary: {
                        total: metrics.total,
                        passed: metrics.passed,
                        failed: metrics.failed,
                        skipped: metrics.skipped,
                        passRate: (metrics.passed / metrics.total * 100).toFixed(2),
                        duration: metrics.duration
                    },
                    browsers: metrics.browserBreakdown,
                    failures: metrics.failedTests || [],
                    status: metrics.failed > 0 ? 'failed' : 'passed'
                },
                timestamp: new Date().toISOString(),
                alertName: 'Test Execution Alert',
                severity: metrics.failed > 0 ? 'critical' : 'info',
                message: metrics.failed > 0 
                    ? `${metrics.failed} test(s) failed out of ${metrics.total} total tests`
                    : 'All tests passed successfully'
            };

            // Set auth header based on environment
            // Use API key auth in CI environment if available, otherwise fall back to basic auth
            let authHeader;
            if (process.env.CI && grafanaApiKey) {
                authHeader = `Bearer ${grafanaApiKey}`;
                console.log('Using API key authentication for Grafana');
            } else {
                authHeader = `Basic ${Buffer.from(`${grafanaUser}:${grafanaPassword}`).toString('base64')}`;
                console.log('Using basic auth authentication for Grafana');
            }
            
            // 1. First send annotation to Grafana for dashboard visualization
            console.log('Sending annotation to Grafana...');
            const annotationResponse = await axios({
                method: 'post',
                url: `${grafanaUrl}/api/annotations`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                data: {
                    time: Date.now(),
                    tags: ['test-execution', metrics.failed > 0 ? 'test-failure' : 'test-success'],
                    text: alertPayload.message,
                    ...alertPayload
                },
                timeout: 5000 // 5 second timeout
            });

            console.log('Grafana annotation response:', annotationResponse.status);

            // 2. If tests failed, directly send an alert to Alertmanager to ensure immediate notification
            if (metrics.failed > 0) {
                console.log('Tests failed! Sending direct alert to Alertmanager...');
                
                // This is the format Alertmanager expects
                const alerts = [{
                    labels: {
                        alertname: 'PlaywrightTestFailure',
                        severity: 'critical',
                        instance: 'playwright-tests',
                        job: 'playwright-tests',
                        test_status: 'failed'
                    },
                    annotations: {
                        summary: `${metrics.failed} test(s) failed out of ${metrics.total}`,
                        description: `Test execution failed with a pass rate of ${(metrics.passed / metrics.total * 100).toFixed(2)}%. Please investigate the failures.`,
                        failed_tests: JSON.stringify(metrics.failedTests.map(t => t.name).join(', '))
                    },
                    startsAt: new Date().toISOString()
                }];
                
                try {
                    // Send alert directly to Alertmanager using v2 API endpoint
                    const alertResponse = await axios({
                        method: 'post',
                        url: `${alertmanagerUrl}/api/v2/alerts`, // Updated to v2 API from v1
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        data: alerts,
                        timeout: 5000
                    });
                    
                    console.log('Alert sent to Alertmanager:', alertResponse.status);
                    console.log('Alert triggered for test failures - email notification should be sent shortly');
                } catch (alertError) {
                    console.error('Failed to send alert to Alertmanager:', {
                        message: alertError.message,
                        status: alertError.response?.status,
                        data: alertError.response?.data
                    });
                }
            }

            console.log('Successfully sent metrics to Grafana');
            console.log(`Metrics summary: ${metrics.passed}/${metrics.total} tests passed in ${metrics.duration}s`);
            
        } catch (error) {
            console.error('Failed to send metrics to Grafana:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                data: error.response?.data
            });
            console.log('Continuing despite Grafana connection error');
        }
    }
}

module.exports = { GrafanaUtils };