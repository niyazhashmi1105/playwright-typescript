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
            .filter(file => file.endsWith('-result.json'))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(resultsDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length === 0) {
            console.error('No test result files found');
            return;
        }

        // Get the start time of the most recent test
        const mostRecentResult = JSON.parse(fs.readFileSync(path.join(resultsDir, files[0].name)));
        const testRunStart = new Date(mostRecentResult.start).getTime();
        
        // Only consider results from the same test run (within 5 minutes of the most recent test)
        const results = files
            .map(file => {
                const content = JSON.parse(fs.readFileSync(path.join(resultsDir, file.name)));
                // Extract browser from parameters or file name
                let browser = 'unknown';
                if (content.parameters) {
                    const projectParam = content.parameters.find(p => p.name === 'Project');
                    if (projectParam) {
                        browser = projectParam.value;
                    }
                } else if (file.name.includes('-')) {
                    // Try to extract browser from filename as fallback
                    const parts = file.name.split('-');
                    browser = parts[parts.length - 2] || 'unknown';
                }
                return {
                    ...content,
                    time: new Date(content.start).getTime(),
                    title: content.name || content.title,
                    browser: browser.replace(/[^a-zA-Z0-9]/g, ' ').trim() // Clean browser name
                };
            })
            .filter(result => Math.abs(result.time - testRunStart) < 300000); // Within 5 minutes

        // Group by test title AND browser to count each browser execution separately
        const uniqueTests = new Map();
        results.forEach(result => {
            const key = `${result.title}|${result.browser}`;
            if (!uniqueTests.has(key) || result.time > uniqueTests.get(key).time) {
                uniqueTests.set(key, result);
            }
        });

        const uniqueResults = Array.from(uniqueTests.values());
        const browsers = [...new Set(uniqueResults.map(r => r.browser))];

        // Calculate metrics with proper status handling
        const metrics = {
            total: uniqueResults.length,
            passed: uniqueResults.filter(r => r.status?.toLowerCase() === 'passed').length,
            failed: uniqueResults.filter(r => ['failed', 'timedout', 'interrupted'].includes(r.status?.toLowerCase())).length,
            skipped: uniqueResults.filter(r => r.status?.toLowerCase() === 'skipped').length,
            duration: uniqueResults.reduce((acc, r) => acc + ((r.stop - r.start) || 0), 0) / 1000,
            browsers: browsers.length,
            browserBreakdown: browsers.map(browser => ({
                browser,
                total: uniqueResults.filter(r => r.browser === browser).length,
                passed: uniqueResults.filter(r => r.browser === browser && r.status?.toLowerCase() === 'passed').length,
                failed: uniqueResults.filter(r => r.browser === browser && ['failed', 'timedout', 'interrupted'].includes(r.status?.toLowerCase())).length
            })),
            failedTests: uniqueResults
                .filter(r => ['failed', 'timedout', 'interrupted'].includes(r.status?.toLowerCase()))
                .map(r => ({
                    name: r.title,
                    browser: r.browser,
                    error: r.statusDetails?.message || r.error?.message || 'No error details available'
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