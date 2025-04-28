import { Reporter, TestCase, TestResult, FullConfig } from '@playwright/test/reporter';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface TestResultSummary {
    passed: { title: string; browser: string }[];
    failed: { title: string; browser: string; error: string }[];
    total: number;
    passCount: number;
    failCount: number;
}

interface BrowserMetrics {
    browser: string;
    total: number;
    passed: number;
    failed: number;
}

export default class EmailReporter implements Reporter {
    private summary: TestResultSummary;
    private activeProjects: Set<string>;
    private browserMetrics: Map<string, BrowserMetrics>;
    private startTime: Date;

    constructor() {
        this.summary = {
            passed: [],
            failed: [],
            total: 0,
            passCount: 0,
            failCount: 0
        };
        this.activeProjects = new Set();
        this.browserMetrics = new Map();
        this.startTime = new Date();
    }

    onBegin(config: FullConfig): void {
        this.activeProjects = new Set(config.projects.map(project => project.name));
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        const projectName = test.parent.project()?.name;
        
        if (!projectName || !this.activeProjects.has(projectName)) {
            return;
        }

        // Update browser metrics
        const metrics = this.browserMetrics.get(projectName) || {
            browser: projectName,
            total: 0,
            passed: 0,
            failed: 0
        };
        metrics.total++;
        if (result.status === 'passed') {
            metrics.passed++;
            this.summary.passed.push({ title: test.title, browser: projectName });
            this.summary.passCount++;
        } else if (result.status === 'failed') {
            metrics.failed++;
            const errorMessage = this.formatErrorMessage(result.error?.message || 'Unknown error');
            this.summary.failed.push({
                title: test.title,
                browser: projectName,
                error: errorMessage
            });
            this.summary.failCount++;
        }
        this.browserMetrics.set(projectName, metrics);
        this.summary.total++;
    }

    private formatErrorMessage(message: string): string {
        return message
            .replace(/\[\d+m/g, '')
            .replace(/\[2m/g, '')
            .replace(/\[22m/g, '')
            .replace(/\u001b/g, '')
            .replace(/\s*\/\/.*$/gm, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async onEnd(): Promise<void> {
        const duration = (new Date().getTime() - this.startTime.getTime()) / 1000;
        await this.saveMetrics();
        
        // Convert metrics for EmailUtils format
        const { EmailUtils } = require('./email-utils');
        const metrics = {
            total: this.summary.total,
            passed: this.summary.passCount,
            failed: this.summary.failCount,
            duration: duration,
            browserBreakdown: Array.from(this.browserMetrics.values()),
            failedTests: this.summary.failed.map(test => ({
                name: test.title,
                browser: test.browser,
                error: test.error
            }))
        };

        try {
            await EmailUtils.sendTestReport(metrics);
        } catch (error) {
            console.error('Failed to send email report:', error);
            // Don't throw error to avoid failing the test run
        }
    }

    private async saveMetrics(): Promise<void> {
        const metricsPath = path.join(process.cwd(), 'test-results/test-results.json');
        const results = {
            timestamp: new Date().toISOString(),
            summary: this.summary,
            browserMetrics: Array.from(this.browserMetrics.values())
        };

        // Ensure directory exists
        const dir = path.dirname(metricsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(metricsPath, JSON.stringify(results, null, 2));
    }
}