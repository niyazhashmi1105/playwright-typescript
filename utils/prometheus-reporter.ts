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
        const registry = this.metricsServer.getRegistry();

        this.testCounter = new Counter({
            name: 'playwright_tests_total',
            help: 'Total number of tests run',
            labelNames: ['status', 'project', 'browser', 'suite'],
            registers: [registry]
        });

        this.testDurationHistogram = new Histogram({
            name: 'playwright_test_duration_seconds',
            help: 'Test execution time',
            labelNames: ['testName', 'browser', 'status', 'project', 'suite'],
            buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10, 30],
            registers: [registry]
        });

        this.activeTestsGauge = new Gauge({
            name: 'playwright_active_tests',
            help: 'Number of currently running tests',
            labelNames: ['browser', 'project', 'suite'],
            registers: [registry]
        });

        this.testStepCounter = new Counter({
            name: 'playwright_test_steps_total',
            help: 'Total number of test steps',
            labelNames: ['status', 'testName', 'stepName'],
            registers: [registry]
        });

        this.retryCounter = new Counter({
            name: 'playwright_test_retries_total',
            help: 'Total number of test retries',
            labelNames: ['testName', 'browser', 'project'],
            registers: [registry]
        });

        this.testSuiteGauge = new Gauge({
            name: 'playwright_test_suite_info',
            help: 'Information about the test suite execution',
            labelNames: ['project', 'browser', 'status'],
            registers: [registry]
        });

        this.browserMetricsGauge = new Gauge({
            name: 'playwright_browser_metrics',
            help: 'Browser-specific metrics during test execution',
            labelNames: ['metric', 'browser', 'project'],
            registers: [registry]
        });

        this.errorCounter = new Counter({
            name: 'playwright_test_errors_total',
            help: 'Total number of test errors by type',
            labelNames: ['errorType', 'browser', 'project', 'testName'],
            registers: [registry]
        });

        this.memoryGauge = new Gauge({
            name: 'playwright_memory_usage_bytes',
            help: 'Memory usage during test execution',
            labelNames: ['browser', 'project', 'testName'],
            registers: [registry]
        });
    }

    async onBegin(config: FullConfig): Promise<void> {
        console.log('Starting metrics server...');
        try {
            await this.metricsServer.start();
            
            config.projects.forEach(project => {
                console.log(`Setting gauge for project ${project.name}`);
                this.testSuiteGauge.set({ 
                    project: project.name,
                    browser: project.use?.browserName || 'unknown',
                    status: 'running'
                }, 1);
            });
        } catch (error) {
            console.error('Failed to start metrics server:', error);
            // Don't throw the error to allow tests to continue without metrics
        }
    }

    onTestBegin(test: TestCase): void {
        const browser = test.parent.project()?.use?.browserName || 'unknown';
        const project = test.parent.project()?.name || 'unknown';
        const suite = test.parent.title || 'unknown';
        
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

        // Record memory usage if available
        const memoryUsage = (result as any).metadata?.memoryUsage;
        if (memoryUsage) {
            this.memoryGauge.set(
                {
                    browser,
                    project,
                    testName: test.title
                },
                memoryUsage
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