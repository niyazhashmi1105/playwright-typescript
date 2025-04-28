const axios = require('axios');

class GrafanaUtils {
    static async triggerAlert(metrics) {
        try {
            const grafanaUrl = process.env.GRAFANA_URL;
            const grafanaApiKey = process.env.GRAFANA_API_KEY;

            if (!grafanaUrl || !grafanaApiKey) {
                console.warn('Grafana configuration missing. Set GRAFANA_URL and GRAFANA_API_KEY in .env file');
                return;
            }

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

            // Send metrics to Grafana using the correct API endpoint
            // Using Grafana's HTTP API endpoint for annotations which is more commonly available
            const response = await axios({
                method: 'post',
                url: `${grafanaUrl}/api/annotations`,
                headers: {
                    'Authorization': `Bearer ${grafanaApiKey}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    time: Date.now(),
                    tags: ['test-execution', metrics.failed > 0 ? 'test-failure' : 'test-success'],
                    text: alertPayload.message,
                    ...alertPayload
                }
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
            throw error;
        }
    }
}

module.exports = { GrafanaUtils };