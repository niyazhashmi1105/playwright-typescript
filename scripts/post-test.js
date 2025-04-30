require('dotenv').config();
const path = require('path');
const fs = require('fs');
const uploadDashboard = require('./upload-dashboard');
const { EmailUtils } = require('../utils/email-utils');
const { GrafanaUtils } = require('../utils/grafana-utils');

async function postTestMonitoring() {
    try {
        // Upload dashboard if it doesn't exist
        await uploadDashboard();
        
        // Read test results from test-results directory
        const resultsDir = path.join(process.cwd(), 'test-results');
        
        if (!fs.existsSync(resultsDir)) {
            console.error('No test results found in test-results directory');
            return;
        }

        const files = fs.readdirSync(resultsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(resultsDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length === 0) {
            console.error('No test result files found');
            return;
        }

        // Read and parse the test results file
        const testResults = JSON.parse(fs.readFileSync(path.join(resultsDir, files[0].name)));
        
        // Handle both single result and array of results
        const results = Array.isArray(testResults) ? testResults : [testResults];
        
        // Calculate metrics
        const metrics = {
            total: results.length,
            passed: results.filter(r => r.status?.toLowerCase() === 'passed').length,
            failed: results.filter(r => ['failed', 'timedout', 'interrupted'].includes(r.status?.toLowerCase())).length,
            skipped: results.filter(r => r.status?.toLowerCase() === 'skipped').length,
            duration: results.reduce((acc, r) => acc + ((r.duration || 0) / 1000), 0),
            browsers: [...new Set(results.map(r => r.browser || 'unknown'))].length,
            browserBreakdown: Object.entries(
                results.reduce((acc, r) => {
                    const browser = r.browser || 'unknown';
                    acc[browser] = acc[browser] || { total: 0, passed: 0, failed: 0 };
                    acc[browser].total++;
                    if (r.status?.toLowerCase() === 'passed') acc[browser].passed++;
                    if (['failed', 'timedout', 'interrupted'].includes(r.status?.toLowerCase())) acc[browser].failed++;
                    return acc;
                }, {})
            ).map(([browser, stats]) => ({
                browser,
                ...stats
            })),
            failedTests: results
                .filter(r => ['failed', 'timedout', 'interrupted'].includes(r.status?.toLowerCase()))
                .map(r => ({
                    name: r.title || r.name,
                    browser: r.browser || 'unknown',
                    error: r.error?.message || r.failure?.message || 'No error details available'
                }))
        };

        console.log('Test Execution Metrics:', JSON.stringify(metrics, null, 2));

        // Send notifications in parallel
        await Promise.all([
            // Trigger Grafana alert
            GrafanaUtils.triggerAlert(metrics).catch(error => {
                console.error('Failed to trigger Grafana alert:', error.message);
            }),
            // Send email notification
            EmailUtils.sendTestReport(metrics).catch(error => {
                console.error('Failed to send email notification:', error.message);
            })
        ]);
    } catch (error) {
        console.error('Error in post-test monitoring:', error);
        process.exit(1);
    }
}

postTestMonitoring();