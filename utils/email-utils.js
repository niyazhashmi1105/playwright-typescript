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
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                <h2 style="color: ${hasFailures ? '#dc2626' : '#16a34a'};">
                    Playwright Test Execution Report ${hasFailures ? '❌' : '✅'}
                </h2>

                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Summary</h3>
                    <ul style="list-style-type: none; padding: 0;">
                        <li><strong>Total Tests:</strong> ${metrics.total}</li>
                        <li style="color: #16a34a;"><strong>Passed:</strong> ${metrics.passed}</li>
                        ${metrics.failed > 0 ? 
                            `<li style="color: #dc2626;"><strong>Failed:</strong> ${metrics.failed}</li>` : 
                            ''}
                        <li><strong>Pass Rate:</strong> ${passRate}%</li>
                        <li><strong>Duration:</strong> ${metrics.duration.toFixed(2)} seconds</li>
                    </ul>
                </div>

                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Browser Breakdown</h3>
                    ${metrics.browserBreakdown.map(browser => `
                        <div style="margin-bottom: 10px;">
                            <h4 style="margin: 5px 0;">Browser: ${browser.browser}</h4>
                            <ul style="margin: 5px 0;">
                                <li>Total: ${browser.total}</li>
                                <li style="color: green;">Passed: ${browser.passed}</li>
                                ${browser.failed > 0 ? 
                                    `<li style="color: red;">Failed: ${browser.failed}</li>` : 
                                    ''}
                            </ul>
                        </div>
                    `).join('')}
                </div>

                ${metrics.failedTests && metrics.failedTests.length > 0 ? `
                    <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #dc2626; margin-top: 0;">Failed Tests Details</h3>
                        <ul style="margin: 0;">
                            ${metrics.failedTests.map(test => `
                                <li style="margin-bottom: 10px;">
                                    <strong>${test.name}</strong> (${test.browser})
                                    <br>
                                    <span style="color: #666; font-size: 0.9em;">Error: ${test.error}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${hasFailures ? 
                    '<p style="color: #dc2626; font-weight: bold;">⚠️ Action Required: Please investigate the failed tests.</p>' : 
                    '<p style="color: #16a34a; font-weight: bold;">✅ All tests passed successfully!</p>'
                }
            </div>
        `;
    }
}

module.exports = { EmailUtils };