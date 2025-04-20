import fs from 'fs';
import path from 'path';
import { FullConfig, TestCase, TestResult } from '@playwright/test/reporter';

interface ReportSummary {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
}

interface BrowserInfo {
    name: string;
    version: string;
    platform: string;
    headless?: string;
}

interface Action {
    type: 'click' | 'fill' | 'navigate' | 'select';
    selector?: string;
    value?: string;
    description?: string;
    timestamp: string;
}

interface ReportTestStep {
    name: string;
    status: 'running' | 'passed' | 'failed';
    startTime: Date;
    actions: Action[];
    duration: number;
    screenshot: string | null;
    category?: string;
    title?: string;
    error?: Error;
}

interface Test {
    name: string;
    steps: ReportTestStep[];
    status: string;
    startTime: Date;
    duration?: number;
    actions: Action[];
    screenshots: string[];
}

interface Suite {
    name: string;
    tests: Test[];
}

interface Report {
    suites: Suite[];
    summary: ReportSummary;
    browserInfo: BrowserInfo;
    startTime: Date;
    endTime: Date;
    duration: number;
}

export default class HTMLReporter {
    private report: Report;
    private currentSuite: Suite | null;
    private currentTest: Test | null;
    private currentStep: ReportTestStep | null;
    private artifactsPath: string;

    constructor() {
        this.report = {
            suites: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0
            },
            browserInfo: {
                name: '',
                version: '',
                platform: process.platform
            },
            startTime: new Date(),
            endTime: new Date(),
            duration: 0
        };

        this.currentSuite = null;
        this.currentTest = null;
        this.currentStep = null;
        this.artifactsPath = path.join(process.cwd(), 'test-results');

        if (!fs.existsSync(this.artifactsPath)) {
            fs.mkdirSync(this.artifactsPath, { recursive: true });
        }
    }

    async onBegin(config: FullConfig, suite: any): Promise<void> {
        const project = config.projects[0];
        const browserName = project.use.browserName || 'chromium';
        const channel = project.use.channel;

        this.report.browserInfo = {
            name: this.getBrowserName(browserName),
            version: channel || 'latest',
            platform: process.platform,
            headless: project.use.headless ? 'Headless' : 'Headed'
        };

        this.report.startTime = new Date();
    }

    private getBrowserName(browserName: string): string {
        const browserMap: { [key: string]: string } = {
            'chromium': 'Chrome',
            'firefox': 'Firefox',
            'webkit': 'Safari'
        };
        return browserMap[browserName] || browserName;
    }

    onTestBegin(test: TestCase): void {
        if (!this.currentSuite || this.currentSuite.name !== test.parent.title) {
            this.currentSuite = {
                name: test.parent.title || 'Default Suite',
                tests: []
            };
            this.report.suites.push(this.currentSuite);
        }

        this.currentTest = {
            name: test.title,
            steps: [],
            status: 'running',
            startTime: new Date(),
            actions: [],
            screenshots: []
        };
        this.currentSuite.tests.push(this.currentTest);
    }

    onStepBegin(test: TestCase, result: TestResult, step: ReportTestStep): void {
        if (step.category === 'test.step' && this.currentTest) {
            const stepInfo: ReportTestStep = {
                name: step.title || '',
                status: 'running',
                startTime: new Date(),
                actions: [],
                duration: 0,
                screenshot: null
            };
            this.currentTest.steps.push(stepInfo);
            this.currentStep = stepInfo;
        }
    }

    trackPageAction(action: Action): void {
        if (this.currentStep) {
            const formattedAction = {
                ...action,
                timestamp: new Date().toISOString(),
                description: this.formatActionDescription(action)
            };
            this.currentStep.actions.push(formattedAction);
        }
    }

    private formatActionDescription(action: Action): string {
        switch (action.type) {
            case 'click':
                return `Clicked on ${action.selector} ${action.description || ''}`;
            case 'fill':
                return `Entered text in ${action.selector}: ${action.value}`;
            case 'navigate':
                return `Navigated to ${action.value}`;
            case 'select':
                return `Selected option "${action.value}" from ${action.selector}`;
            default:
                return action.description || `${action.type} action performed`;
        }
    }

    onStepEnd(test: TestCase, result: TestResult, step: ReportTestStep): void {
        if (step.category === 'test.step' && this.currentTest) {
            const currentStep = this.currentTest.steps[this.currentTest.steps.length - 1];
            if (currentStep) {
                currentStep.status = step.error ? 'failed' : 'passed';
                currentStep.duration = new Date().getTime() - currentStep.startTime.getTime();

                if (step.error && result.attachments) {
                    const screenshot = result.attachments.find(a => a.name === 'screenshot');
                    if (screenshot && screenshot.path) {
                        const screenshotName = `${test.title}-${step.title || ''}-failed.png`.replace(/[^a-zA-Z0-9-]/g, '_');
                        const screenshotPath = path.join(this.artifactsPath, screenshotName);
                        fs.copyFileSync(screenshot.path, screenshotPath);
                        currentStep.screenshot = screenshotName;
                    }
                }
            }
        }
    }

    async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
        if (this.currentTest) {
            this.currentTest.status = result.status;
            this.currentTest.duration = result.duration;
            this.report.summary[result.status as keyof ReportSummary]++;
            this.report.summary.total++;

            if (result.status === 'failed' && result.attachments) {
                for (const attachment of result.attachments) {
                    if (attachment.name === 'screenshot' && attachment.path) {
                        const screenshotName = `${test.title}-failed.png`.replace(/[^a-zA-Z0-9-]/g, '_');
                        const screenshotPath = path.join(this.artifactsPath, screenshotName);
                        fs.copyFileSync(attachment.path, screenshotPath);
                        this.currentTest.screenshots.push(screenshotName);
                    }
                }
            }
        }
    }

    async onEnd(result: any): Promise<void> {
        this.report.endTime = new Date();
        this.report.duration = this.report.endTime.getTime() - this.report.startTime.getTime();

        const html = this.generateHTML();
        const reportPath = path.join(process.cwd(), 'playwright-report');

        if (!fs.existsSync(reportPath)) {
            fs.mkdirSync(reportPath, { recursive: true });
        }

        fs.writeFileSync(path.join(reportPath, 'custom-report.html'), html);
    }

    private generateHTML(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright Test Report</title>
    <style>
        :root {
            --primary-color: #2563eb;
            --success-color: #22c55e;
            --error-color: #ef4444;
            --warning-color: #eab308;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: #f8fafc;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }

        .browser-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            background: #f1f5f9;
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }

        .summary-item {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .suite {
            background: white;
            margin: 1.5rem 0;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .test {
            border-left: 4px solid #e2e8f0;
            margin: 1rem 0;
            padding: 1rem;
        }

        .test.passed { border-left-color: var(--success-color); }
        .test.failed { border-left-color: var(--error-color); }
        .test.skipped { border-left-color: var(--warning-color); }

        .step {
            margin: 0.5rem 0 0.5rem 1rem;
            padding: 0.5rem;
            border-left: 2px solid #e2e8f0;
        }

        .step.passed { border-left-color: var(--success-color); }
        .step.failed { border-left-color: var(--error-color); }

        .screenshot-container {
            margin: 1rem 0;
        }

        .screenshot {
            max-width: 800px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .duration {
            font-size: 0.9rem;
            color: #64748b;
        }

        .actions {
            margin-left: 1rem;
            font-size: 0.9rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Playwright Test Report</h1>
            <div class="browser-info">
                <div><strong>Browser:</strong> ${this.report.browserInfo.name}</div>
                <div><strong>Platform:</strong> ${this.report.browserInfo.platform}</div>
                <div><strong>Start:</strong> ${this.report.startTime.toLocaleString()}</div>
                <div><strong>Duration:</strong> ${(this.report.duration / 1000).toFixed(2)}s</div>
            </div>
            <div class="summary">
                <div class="summary-item">
                    <h3>Total</h3>
                    <div>${this.report.summary.total}</div>
                </div>
                <div class="summary-item passed">
                    <h3>Passed</h3>
                    <div>${this.report.summary.passed}</div>
                </div>
                <div class="summary-item failed">
                    <h3>Failed</h3>
                    <div>${this.report.summary.failed}</div>
                </div>
                <div class="summary-item skipped">
                    <h3>Skipped</h3>
                    <div>${this.report.summary.skipped}</div>
                </div>
            </div>
        </div>

        ${this.report.suites.map((suite: any) => `
            <div class="suite">
                <h2>${suite.name}</h2>
                ${suite.tests.map((test: any) => `
                    <div class="test ${test.status}">
                        <h3>${test.name}</h3>
                        <p class="duration">Duration: ${(test.duration / 1000).toFixed(2)}s</p>
                        ${test.steps.map((step: any) => `
                            <div class="step ${step.status}">
                                <p>${step.name} (${step.status}) - ${(step.duration / 1000).toFixed(2)}s</p>
                                ${step.actions && step.actions.length > 0 ? `
                                    <div class="actions">
                                        ${step.actions.map((action: any) => `
                                            <div>${action.timestamp}: ${action.action}</div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                ${step.screenshot ? `
                                    <div class="screenshot-container">
                                        <img src="../test-results/${step.screenshot}" class="screenshot" alt="Step Screenshot">
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                        ${test.screenshots.map((screenshot: string) => `
                            <div class="screenshot-container">
                                <h4>Failed Test Screenshot</h4>
                                <img src="../test-results/${screenshot}" class="screenshot" alt="Failed Test Screenshot">
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    }
}
