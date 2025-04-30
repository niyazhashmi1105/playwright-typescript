const nodemailer = require('nodemailer');

class EmailUtils {
    static async sendTestReport(metrics) {
        // Validate required SMTP configuration
        const requiredEnvVars = {
            SMTP_HOST: process.env.SMTP_HOST,
            SMTP_PORT: process.env.SMTP_PORT,
            SMTP_USER: process.env.SMTP_USER,
            SMTP_PASSWORD: process.env.SMTP_PASSWORD,
            SMTP_FROM: process.env.SMTP_FROM,
            SMTP_TO: process.env.SMTP_TO
        };

        // Check for missing configuration
        const missingVars = Object.entries(requiredEnvVars)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

        if (missingVars.length > 0) {
            console.error(`Missing required SMTP configuration: ${missingVars.join(', ')}`);
            console.error('Please set these variables in your .env file');
            return;
        }

        // Retry configuration
        const maxRetries = 3;
        const baseDelay = 5000; // 5 seconds

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT),
                    secure: process.env.SMTP_PORT === '465',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASSWORD
                    },
                    pool: true, // Use pooled connections
                    maxConnections: 1, // Limit concurrent connections
                    maxMessages: 3, // Limit messages per connection
                    rateDelta: 1000, // Minimum time between messages
                    rateLimit: 3, // Maximum number of messages per rateDelta
                    logger: process.env.DEBUG === 'true' // Enable logging if DEBUG=true
                });

                // Wait for connection pool to be ready
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Verify SMTP connection configuration
                await transporter.verify();

                const emailContent = EmailUtils.generateEmailContent(metrics);
                
                await transporter.sendMail({
                    from: `"${process.env.SMTP_FROM_NAME || 'Test Reporter'}" <${process.env.SMTP_FROM}>`,
                    to: process.env.SMTP_TO,
                    subject: `Test Report ${metrics.failed > 0 ? '❌ Failed' : '✅ Passed'} (${(metrics.passed / metrics.total * 100).toFixed(2)}% Pass Rate)`,
                    html: emailContent
                });

                // Close the connection pool
                transporter.close();
                
                console.log('Test report email sent successfully');
                return;
            } catch (error) {
                const isLastAttempt = attempt === maxRetries;
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff

                console.error(`Failed to send email (attempt ${attempt}/${maxRetries}):`, {
                    message: error.message,
                    code: error.code,
                    command: error.command
                });

                if (error.code === 'EAUTH' || error.responseCode === 454) {
                    console.log('Gmail rate limit detected, waiting before retry...');
                }

                if (!isLastAttempt) {
                    console.log(`Retrying in ${delay/1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('Max retries reached. Email could not be sent.');
                }
            }
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
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = { EmailUtils };