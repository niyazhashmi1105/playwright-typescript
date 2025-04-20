import { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { testCounter, testDuration, testRetries, startMetricsServer } from './metrics-server';

interface PrometheusReporterOptions {
    port?: number;
    enabled?: boolean;
}

class PrometheusReporter implements Reporter {
    private server: any;
    private currentSuite: string = '';
    private options: PrometheusReporterOptions;

    constructor(options: PrometheusReporterOptions = {}) {
        this.options = {
            port: options.port || 9323,
            enabled: options.enabled !== false
        };
        
        if (this.options.enabled) {
            this.server = startMetricsServer(this.options.port);
        }
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
        // Keep the metrics server running but log that tests are complete
        console.log('Tests complete. Metrics server still running on port', this.options.port);
    }
}

export default PrometheusReporter;