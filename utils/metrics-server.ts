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

let metricsServer: any = null;

export function startMetricsServer(port = process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : 9323) {
    if (metricsServer) {
        return metricsServer;
    }

    const app = express();

    // Enable metrics endpoint with CORS enabled for Prometheus
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        next();
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.send('OK');
    });

    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            const metrics = await register.metrics();
            res.end(metrics);
        } catch (err) {
            console.error('Error collecting metrics:', err);
            res.status(500).end();
        }
    });

    // Start server - listen on all interfaces
    metricsServer = app.listen(port, '0.0.0.0', () => {
        console.log(`Metrics server listening on port ${port}`);
    });

    // Handle server errors
    metricsServer.on('error', (err: Error) => {
        console.error('Metrics server error:', err);
    });

    // Setup graceful shutdown
    process.on('SIGTERM', () => {
        if (metricsServer) {
            metricsServer.close(() => {
                console.log('Metrics server stopped');
            });
        }
    });

    return metricsServer;
}