import client from 'prom-client';
import express from 'express';

// Create a Registry to register metrics
const register = new client.Registry();

// Create counters and histograms for test metrics
export const testCounter = new client.Counter({
    name: 'playwright_test_total',
    help: 'Total number of tests executed',
    labelNames: ['status', 'browser', 'suite']
});

export const testDuration = new client.Histogram({
    name: 'playwright_test_duration_seconds',
    help: 'Test execution time in seconds',
    labelNames: ['test_name', 'browser', 'suite'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const testRetries = new client.Counter({
    name: 'playwright_test_retries_total',
    help: 'Total number of test retries',
    labelNames: ['test_name', 'browser']
});

// Register metrics
register.registerMetric(testCounter);
register.registerMetric(testDuration);
register.registerMetric(testRetries);

export function startMetricsServer(port = process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : 9323) {
    const app = express();

    // Enable metrics endpoint with CORS enabled for Prometheus
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        next();
    });

    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });

    // Start server - listen on all interfaces
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`Metrics server listening on port ${port}`);
    });

    return server;
}