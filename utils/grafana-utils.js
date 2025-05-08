const axios = require('axios');

class GrafanaUtils {
    static async triggerAlert(metrics) {
        try {
            // Use Docker service name when in CI environment
            const grafanaUrl = process.env.CI ? 'http://grafana:3000' : 'http://localhost:3002';
            
            // Get authentication details from environment variables
            // Use the same env var names as in docker-compose
            const grafanaUser = process.env.GF_SECURITY_ADMIN_USER || 'admin';
            const grafanaPassword = process.env.GF_SECURITY_ADMIN_PASSWORD || 'admin';

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

            // Create Basic Auth token from credentials
            const auth = Buffer.from(`${grafanaUser}:${grafanaPassword}`).toString('base64');
            
            // Send metrics to Grafana using the correct API endpoint
            const response = await axios({
                method: 'post',
                url: `${grafanaUrl}/api/annotations`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`
                },
                data: {
                    time: Date.now(),
                    tags: ['test-execution', metrics.failed > 0 ? 'test-failure' : 'test-success'],
                    text: alertPayload.message,
                    ...alertPayload
                },
                timeout: 5000 // 5 second timeout
            });

            if (response.status >= 200 && response.status < 300) {
                console.log('Successfully sent metrics to Grafana');
                console.log(`Metrics summary: ${metrics.passed}/${metrics.total} tests passed in ${metrics.duration}s`);
                if (metrics.failed > 0) {
                    console.log('Alert triggered due to test failures');
                }
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to send metrics to Grafana:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                data: error.response?.data
            });
            // Don't throw the error, just log it to prevent build failure
            console.log('Continuing despite Grafana connection error');
        }
    }
}

module.exports = { GrafanaUtils };