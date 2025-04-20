import { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { testCounter, testDuration, testRetries, startMetricsServer } from './metrics-server';

class PrometheusReporter implements Reporter {
    private server: any;
    private currentSuite: string = '';

    constructor() {
        this.server = startMetricsServer();
    }

    onBegin(config: FullConfig, suite: Suite) {
        // Reset metrics when test run begins
        testCounter.reset();
        testDuration.reset();
        testRetries.reset();
    }

    onTestBegin(test: TestCase) {
        this.currentSuite = test.parent.title;
    }

    onTestEnd(test: TestCase, result: TestResult) {
        // Record test result
        testCounter.inc({
            status: result.status,
            browser: test.parent.project()?.name || 'unknown',
            suite: this.currentSuite
        });

        // Record test duration
        testDuration.observe(
            {
                test_name: test.title,
                browser: test.parent.project()?.name || 'unknown',
                suite: this.currentSuite
            },
            result.duration / 1000 // Convert ms to seconds
        );

        // Record retries if any
        if (result.retry > 0) {
            testRetries.inc({
                test_name: test.title,
                browser: test.parent.project()?.name || 'unknown'
            });
        }
    }

    async onEnd() {
        // Keep the metrics server running after tests complete
        // You might want to add a cleanup mechanism in a real implementation
    }
}

export default PrometheusReporter;