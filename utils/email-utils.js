const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailUtils {
    static async sendTestReport(metrics) {
        try {
            // Use hardcoded Gmail configuration - aligned with alertmanager.yml
            // This ensures emails are consistently sent with the same configuration
            const SMTP_CONFIG = {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: 'hashmimdniyaz@gmail.com',
                    pass: process.env.SMTP_PASSWORD || 'mtqobzrwneayturw' // Use env var if available, otherwise use value from alertmanager.yml
                },
                tls: {
                    rejectUnauthorized: false,
                    minVersion: 'TLSv1.2'
                }
            };
            
            console.log(`Creating email transport with host: ${SMTP_CONFIG.host}, port: ${SMTP_CONFIG.port}`);
            
            const transporter = nodemailer.createTransport(SMTP_CONFIG);

            // Verify connection configuration
            await transporter.verify().catch(err => {
                console.error('SMTP connection verification failed:', err.message);
                throw err;
            });
            
            console.log('SMTP connection verified successfully');

            const attachments = [];
            const reportPath = path.join(process.cwd(), 'playwright-report/index.html');
            
            if (fs.existsSync(reportPath)) {
                attachments.push({
                    filename: 'playwright-report.html',
                    content: fs.readFileSync(reportPath, 'utf-8'),
                    contentType: 'text/html'
                });
            }

            await transporter.sendMail({
                from: '"Test Reporter" <hashmimdniyaz@gmail.com>',
                to: 'hashmimdniyaz@gmail.com', // Using the same email address from alertmanager.yml
                subject: `Test Report ${metrics.failed > 0 ? '❌ Failed' : '✅ Passed'} (${(metrics.passed / metrics.total * 100).toFixed(2)}% Pass Rate)`,
                html: this.generateEmailContent(metrics),
                attachments: attachments
            });

            // Close the connection pool
            transporter.close();
            console.log('Test report email sent successfully');
        } catch (error) {
            console.error('Failed to send email:', error.message);
            if (error.code) {
                console.error('Error code:', error.code);
            }
            // Don't throw error to avoid failing the test run
        }
    }

    static generateEmailContent(metrics) {
        const passRate = (metrics.passed / metrics.total * 100).toFixed(2);
        const hasFailures = metrics.failed > 0;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Test Report</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f5f5f5;
                        font-size: 16px;
                    }
                    .container {
                        max-width: 800px;
                        margin: 20px auto;
                        background-color: #fff;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        padding: 24px;
                    }
                    h2 {
                        font-size: 24px;
                        font-weight: 600;
                        color: ${hasFailures ? '#dc2626' : '#16a34a'};
                        margin: 0 0 24px;
                        padding-bottom: 12px;
                        border-bottom: 2px solid ${hasFailures ? '#fee2e2' : '#dcfce7'};
                        letter-spacing: -0.01em;
                    }
                    h3 {
                        font-size: 20px;
                        font-weight: 600;
                        margin: 0 0 16px;
                        color: #1a1a1a;
                    }
                    h4 {
                        font-size: 16px;
                        font-weight: 600;
                        margin: 16px 0 8px;
                        color: #1a1a1a;
                    }
                    .section {
                        background-color: #f8fafc;
                        padding: 20px;
                        border-radius: 6px;
                        margin: 20px 0;
                        border: 1px solid #e2e8f0;
                    }
                    .error-section {
                        background-color: #fef2f2;
                        border: 1px solid #fee2e2;
                    }
                    .warning-section {
                        background-color: #fef3c7;
                        border: 1px solid #fde68a;
                    }
                    ul {
                        list-style-type: none;
                        padding: 0;
                        margin: 0;
                    }
                    li {
                        margin-bottom: 8px;
                        font-size: 15px;
                    }
                    .browser-stats {
                        padding: 12px;
                        border-radius: 4px;
                        background: #fff;
                        margin: 8px 0;
                        border: 1px solid #e5e7eb;
                    }
                    .stat-value {
                        font-weight: 500;
                        color: #1a1a1a;
                    }
                    .error-message {
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                        font-size: 14px;
                        padding: 8px;
                        background: rgba(0,0,0,0.05);
                        border-radius: 4px;
                        margin-top: 4px;
                        color: #dc2626;
                    }
                    .status-message {
                        font-size: 16px;
                        font-weight: 600;
                        padding: 12px 16px;
                        border-radius: 6px;
                        margin-top: 20px;
                        background-color: ${hasFailures ? '#fee2e2' : '#dcfce7'};
                        color: ${hasFailures ? '#dc2626' : '#16a34a'};
                    }
                    .note {
                        font-size: 14px;
                        color: #666;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Playwright Test Execution Report ${hasFailures ? '❌' : '✅'}</h2>

                    <div class="section">
                        <h3>Summary</h3>
                        <ul>
                            <li><span class="stat-value">Total Tests:</span> ${metrics.total}</li>
                            <li style="color: #16a34a;"><span class="stat-value">Passed:</span> ${metrics.passed}</li>
                            ${metrics.failed > 0 ? 
                                `<li style="color: #dc2626;"><span class="stat-value">Failed:</span> ${metrics.failed}</li>` : 
                                ''}
                            ${metrics.skipped > 0 ? 
                                `<li style="color: #eab308;"><span class="stat-value">Skipped:</span> ${metrics.skipped}</li>` : 
                                ''}
                            <li><span class="stat-value">Pass Rate:</span> ${passRate}%</li>
                            <li><span class="stat-value">Duration:</span> ${metrics.duration.toFixed(2)} seconds</li>
                        </ul>
                    </div>

                    <div class="section">
                        <h3>Browser Breakdown</h3>
                        ${metrics.browserBreakdown.map(browser => `
                            <div class="browser-stats">
                                <h4>Browser: ${browser.browser}</h4>
                                <ul>
                                    <li><span class="stat-value">Total:</span> ${browser.total}</li>
                                    <li style="color: #16a34a;"><span class="stat-value">Passed:</span> ${browser.passed}</li>
                                    ${browser.failed > 0 ? 
                                        `<li style="color: #dc2626;"><span class="stat-value">Failed:</span> ${browser.failed}</li>` : 
                                        ''}
                                    ${browser.skipped > 0 ? 
                                        `<li style="color: #eab308;"><span class="stat-value">Skipped:</span> ${browser.skipped}</li>` : 
                                        ''}
                                </ul>
                            </div>
                        `).join('')}
                    </div>

                    ${metrics.failedTests && metrics.failedTests.length > 0 ? `
                        <div class="section error-section">
                            <h3 style="color: #dc2626;">Failed Tests Details</h3>
                            <ul>
                                ${metrics.failedTests.map(test => `
                                    <li>
                                        <strong>${test.name}</strong> (${test.browser})
                                        <div class="error-message">${test.error}</div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${metrics.skippedTests && metrics.skippedTests.length > 0 ? `
                        <div class="section warning-section">
                            <h3 style="color: #92400e;">Skipped Tests Details</h3>
                            <ul>
                                ${metrics.skippedTests.map(test => `
                                    <li>
                                        <strong>${test.name}</strong> (${test.browser})
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    <div class="status-message">
                        ${hasFailures ? 
                            '⚠️ Action Required: Please investigate the failed tests.' : 
                            '✅ All tests passed successfully!'
                        }
                    </div>

                    <div class="note">
                        Note: Detailed HTML report is attached to this email.
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = { EmailUtils };