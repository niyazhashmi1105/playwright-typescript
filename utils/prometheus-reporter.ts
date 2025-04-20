import { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { testCounter, testDuration, testRetries, startMetricsServer } from './metrics-server';

interface PrometheusReporterConfig {
    port?: number;
    enabled?: boolean;
}

class PrometheusReporter implements Reporter {
    private server: any;
    private currentSuite: string = '';

    constructor(config: PrometheusReporterConfig = {}) {
        const port = process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : (config.port || 9323);
        if (config.enabled !== false) {
            this.server = startMetricsServer(port);
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
        try {
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
        } catch (error) {
            console.error('Error recording metrics:', error);
        }
    }

    async onEnd() {
        // Do not close the server, let it run for Prometheus to scrape
        console.log('Tests complete. Metrics server still running on port', process.env.METRICS_PORT || 9323);
    }
}

export default PrometheusReporter;