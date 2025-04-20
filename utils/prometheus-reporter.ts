import { Reporter, FullConfig, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import { Counter, Gauge, Histogram } from 'prom-client';
import { MetricsServer } from './metrics-server';

export default class PrometheusReporter implements Reporter {
    private metricsServer: MetricsServer;
    private testCounter: Counter;
    private testDurationHistogram: Histogram;
    private activeTestsGauge: Gauge;
    private testStepCounter: Counter;

    constructor() {
        const port = process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : 9323;
        this.metricsServer = new MetricsServer(port);

        const registry = this.metricsServer.getRegistry();

        // Initialize metrics
        this.testCounter = new Counter({
            name: 'playwright_tests_total',
            help: 'Total number of tests run',
            labelNames: ['status'],
            registers: [registry]
        });

        this.testDurationHistogram = new Histogram({
            name: 'playwright_test_duration_seconds',
            help: 'Test execution time',
            registers: [registry]
        });

        this.activeTestsGauge = new Gauge({
            name: 'playwright_active_tests',
            help: 'Number of currently running tests',
            registers: [registry]
        });

        this.testStepCounter = new Counter({
            name: 'playwright_test_steps_total',
            help: 'Total number of test steps',
            labelNames: ['status'],
            registers: [registry]
        });
    }

    onBegin(config: FullConfig) {
        this.metricsServer.start();
    }

    onTestBegin(test: TestCase) {
        this.activeTestsGauge.inc();
    }

    onTestEnd(test: TestCase, result: TestResult) {
        this.activeTestsGauge.dec();
        this.testCounter.inc({ 
            status: result.status
        });
        this.testDurationHistogram.observe(result.duration / 1000); // Convert to seconds

        // Count steps
        result.steps.forEach((step: TestStep) => {
            this.testStepCounter.inc({
                status: step.error ? 'failed' : 'passed'
            });
        });
    }
}