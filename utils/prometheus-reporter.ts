import { Reporter, FullConfig, TestCase, TestResult, TestStep, TestError } from '@playwright/test/reporter';
import { Counter, Gauge, Histogram } from 'prom-client';
import { MetricsServer } from './metrics-server';

export default class PrometheusReporter implements Reporter {
    private metricsServer: MetricsServer;
    private testCounter: Counter<string>;
    private testDurationHistogram: Histogram<string>;
    private activeTestsGauge: Gauge<string>;
    private testStepCounter: Counter<string>;
    private retryCounter: Counter<string>;
    private testSuiteGauge: Gauge<string>;
    private browserMetricsGauge: Gauge<string>;
    private errorCounter: Counter<string>;
    private memoryGauge: Gauge<string>;
    private isGitHubAction: boolean;

    constructor() {
        // Always use port 9323 for consistency
        const port = 9323;
        this.metricsServer = MetricsServer.getInstance(port);
        this.isGitHubAction = process.env.GITHUB_ACTIONS === 'true';

        // Get metrics from MetricsServer instance
        this.testCounter = this.metricsServer.getTestCounter();
        this.testDurationHistogram = this.metricsServer.getTestDurationHistogram();
        this.activeTestsGauge = this.metricsServer.getActiveTestsGauge();
        this.testStepCounter = this.metricsServer.getTestStepCounter();
        this.retryCounter = this.metricsServer.getRetryCounter();
        this.testSuiteGauge = this.metricsServer.getTestSuiteGauge();
        this.browserMetricsGauge = this.metricsServer.getBrowserMetricsGauge();
        this.errorCounter = this.metricsServer.getErrorCounter();
        this.memoryGauge = this.metricsServer.getMemoryGauge();
    }

    async onBegin(config: FullConfig): Promise<void> {
        console.log('Starting metrics server...');
        try {
            await this.metricsServer.start();
            
            // Reset all metrics at the start of a test run
            const registry = this.metricsServer.getRegistry();
            await registry.resetMetrics();
            
            config.projects.forEach(project => {
                console.log(`Setting gauge for project ${project.name}`);
                this.testSuiteGauge.set({ 
                    project: project.name,
                    browser: project.use?.browserName || 'unknown',
                    status: 'running'
                }, 0); // Initialize with 0
            });
        } catch (error) {
            console.error('Failed to start metrics server:', error);
        }
    }

    onTestBegin(test: TestCase): void {
        const browser = test.parent.project()?.use?.browserName || 'unknown';
        const project = test.parent.project()?.name || 'unknown';
        const suite = test.parent.title || 'unknown';
        
        // Track initial memory usage
        const memoryUsage = process.memoryUsage();
        this.memoryGauge.set(
            {
                browser,
                project,
                testName: test.title
            },
            memoryUsage.heapUsed
        );

        this.activeTestsGauge.inc({
            browser,
            project,
            suite
        });
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        const browser = test.parent.project()?.use?.browserName || 'unknown';
        const project = test.parent.project()?.name || 'unknown';
        const suite = test.parent.title || 'unknown';

        // Increment test counter
        this.testCounter.inc({
            status: result.status,
            project,
            browser,
            suite
        });

        // Record test duration
        this.testDurationHistogram.observe(
            {
                testName: test.title,
                browser,
                status: result.status,
                project,
                suite
            },
            result.duration / 1000
        );

        // Decrement active tests
        this.activeTestsGauge.dec({
            browser,
            project,
            suite
        });

        // Record retry count if any
        if (result.retry > 0) {
            this.retryCounter.inc({
                testName: test.title,
                browser,
                project
            });
        }

        // Track final memory usage
        const memoryUsage = process.memoryUsage();
        this.memoryGauge.set(
            {
                browser,
                project,
                testName: test.title
            },
            memoryUsage.heapUsed
        );

        // Record memory usage if available
        const resultMemoryUsage = (result as any).metadata?.memoryUsage;
        if (resultMemoryUsage) {
            this.memoryGauge.set(
                {
                    browser,
                    project,
                    testName: test.title
                },
                resultMemoryUsage
            );
        }

        // Record test steps
        result.steps.forEach((step: TestStep) => {
            this.testStepCounter.inc({
                status: step.error ? 'failed' : 'passed',
                testName: test.title,
                stepName: step.title
            });

            if (step.error) {
                this.errorCounter.inc({
                    errorType: (step.error as TestError).message?.split('\n')[0]?.substring(0, 50) || 'unknown',
                    browser,
                    project,
                    testName: test.title
                });
            }
        });

        // Record browser metrics
        if (result.duration > 0) {
            this.browserMetricsGauge.set(
                { 
                    metric: 'duration',
                    browser,
                    project
                },
                result.duration / 1000
            );
        }
    }

    async onEnd(): Promise<void> {
        console.log('Tests completed - finalizing metrics...');
        
        try {
            // Keep metrics server running for 30 seconds after tests complete
            // This gives Prometheus time to scrape final metrics
            console.log('Keeping metrics server alive for 30 seconds to allow final scraping...');
            await new Promise(resolve => setTimeout(resolve, 30000));
            
            await this.metricsServer.close();
            console.log('Metrics server closed successfully');
        } catch (error) {
            console.error('Error closing metrics server:', error);
        }
    }
}