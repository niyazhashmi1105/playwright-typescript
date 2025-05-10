require('dotenv').config();
const path = require('path');
const fs = require('fs');
const uploadDashboard = require('./upload-dashboard');
const { EmailUtils } = require('../utils/email-utils');
const { GrafanaUtils } = require('../utils/grafana-utils');

// Use a process-wide flag to prevent duplicate notifications
// This is more reliable than file locks which might have permission issues
let notificationSent = false;

// Create a unique ID for this test run to track in logs
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).substring(2, 8);

async function postTestMonitoring() {
    try {
        console.log(`Starting post-test monitoring... (Run ID: ${RUN_ID})`);
        console.log('Environment:', process.env.CI ? 'CI/Docker' : 'Local');
        
        // Check if notifications were already sent in this process
        if (notificationSent) {
            console.log(`Notifications already sent in this process run. Skipping duplicate notifications. (Run ID: ${RUN_ID})`);
            return;
        }
        
        // Upload dashboard if it doesn't exist
        console.log('Uploading dashboard...');
        await uploadDashboard().catch(error => {
            console.error('Dashboard upload failed:', error.message);
            // Continue execution even if dashboard upload fails
        });
        
        // Read test results from test-results directory
        const resultsDir = path.join(process.cwd(), 'test-results');
        console.log('Reading test results from:', resultsDir);
        
        if (!fs.existsSync(resultsDir)) {
            console.error('No test results found in test-results directory');
            return;
        }

        // Look specifically for the consolidated test-results.json file first
        const consolidatedResultsPath = path.join(resultsDir, 'test-results.json');
        let testResults;
        let results = [];

        if (fs.existsSync(consolidatedResultsPath)) {
            console.log('Found consolidated test results file:', consolidatedResultsPath);
            testResults = JSON.parse(fs.readFileSync(consolidatedResultsPath, 'utf8'));
            
            // Extract test data from the consolidated format
            if (testResults.summary) {
                // Process passed tests
                if (testResults.summary.passed && Array.isArray(testResults.summary.passed)) {
                    results = results.concat(testResults.summary.passed.map(test => ({
                        title: test.title,
                        browser: test.browser,
                        status: 'passed'
                    })));
                }
                
                // Process failed tests
                if (testResults.summary.failed && Array.isArray(testResults.summary.failed)) {
                    results = results.concat(testResults.summary.failed.map(test => ({
                        title: test.title,
                        browser: test.browser,
                        status: 'failed',
                        error: { message: test.error || 'Unknown error' }
                    })));
                }
                
                // Process skipped tests
                if (testResults.summary.skipped && Array.isArray(testResults.summary.skipped)) {
                    results = results.concat(testResults.summary.skipped.map(test => ({
                        title: test.title,
                        browser: test.browser,
                        status: 'skipped'
                    })));
                }
            }
        } else {
            // Fall back to the original logic of searching for individual result files
            const files = fs.readdirSync(resultsDir)
                .filter(file => file.endsWith('results.json'))
                .map(file => ({
                    name: file,
                    time: fs.statSync(path.join(resultsDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length === 0) {
                console.error('No test result files found');
                return;
            }

            console.log('Found test results file:', files[0].name);
            testResults = JSON.parse(fs.readFileSync(path.join(resultsDir, files[0].name)));
            
            // Handle both single result and array of results
            results = Array.isArray(testResults) ? testResults : [testResults];
        }

        if (results.length === 0) {
            console.error('No test results data found in the files');
            return;
        }
        
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

        console.log(`Test Execution Metrics for run ${RUN_ID}:`, JSON.stringify(metrics, null, 2));

        // Set the flag to prevent duplicate notifications
        notificationSent = true;
        console.log(`Setting notification flag to prevent duplicates. (Run ID: ${RUN_ID})`);

        // Send email notification once and wait for it to complete
        console.log(`Sending email notification... (Run ID: ${RUN_ID})`);
        await EmailUtils.sendTestReport(metrics, RUN_ID).catch(error => {
            console.error('Failed to send email notification:', error.message);
        });
        
        // After the email is sent successfully, update Grafana
        console.log(`Sending alert to Grafana... (Run ID: ${RUN_ID})`);
        await GrafanaUtils.triggerAlert(metrics).catch(error => {
            console.error('Failed to trigger Grafana alert:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.error('Connection refused. If running in Docker, ensure Grafana service is accessible via Docker network');
            }
        });

        console.log(`Post-test monitoring completed. (Run ID: ${RUN_ID})`);
    } catch (error) {
        console.error(`Error in post-test monitoring (Run ID: ${RUN_ID}):`, error);
        // Don't exit with error code to prevent build failure
        console.log('Continuing despite post-test monitoring error');
    }
}

// Only run the monitoring once per module load
if (require.main === module) {
    postTestMonitoring();
}

module.exports = { postTestMonitoring };