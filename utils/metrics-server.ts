import * as express from 'express';
import { Server } from 'http';
import { register, Registry, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';
import * as net from 'net';
import * as os from 'os';

export class MetricsServer {
    private static instance: MetricsServer | null = null;
    private app: express.Application;
    private server: Server | null;
    private registry: Registry;
    private metricsInterval: NodeJS.Timeout | null;
    private currentPort: number;
    private isShuttingDown: boolean = false;
    private keepAliveTimer: NodeJS.Timeout | null = null;
    private static readonly KEEP_ALIVE_DURATION = 300000; // 5 minutes in milliseconds
    private static readonly MAX_PORT_ATTEMPTS = 10; // Maximum number of port attempts

    // Initialize metrics with dummy values that will be overwritten in initializeMetrics
    private testCounter: Counter<string> = new Counter({
        name: 'playwright_tests_total',
        help: 'Total number of tests run',
        labelNames: ['status', 'project', 'browser', 'suite']
    });
    private activeTestsGauge: Gauge<string> = new Gauge({
        name: 'playwright_active_tests',
        help: 'Number of currently running tests',
        labelNames: ['browser', 'project', 'suite']
    });
    private testDurationHistogram: Histogram<string> = new Histogram({
        name: 'playwright_test_duration_seconds',
        help: 'Test execution time',
        labelNames: ['testName', 'browser', 'status', 'project', 'suite'],
        buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10, 30]
    });
    private testStepCounter: Counter<string> = new Counter({
        name: 'playwright_test_steps_total',
        help: 'Total number of test steps',
        labelNames: ['status', 'testName', 'stepName']
    });
    private testSuiteGauge: Gauge<string> = new Gauge({
        name: 'playwright_test_suite_info',
        help: 'Information about the test suite execution',
        labelNames: ['project', 'browser', 'status']
    });
    private browserMetricsGauge: Gauge<string> = new Gauge({
        name: 'playwright_browser_metrics',
        help: 'Browser-specific metrics during test execution',
        labelNames: ['metric', 'browser', 'project']
    });
    private errorCounter: Counter<string> = new Counter({
        name: 'playwright_test_errors_total',
        help: 'Total number of test errors by type',
        labelNames: ['errorType', 'browser', 'project', 'testName']
    });
    private memoryGauge: Gauge<string> = new Gauge({
        name: 'playwright_memory_usage_bytes',
        help: 'Memory usage during test execution',
        labelNames: ['browser', 'project', 'testName']
    });

    private constructor(private port: number) {
        this.app = express.default();  // Fix express() call
        this.server = null;
        this.registry = new Registry();
        this.metricsInterval = null;
        this.keepAliveTimer = null;
        this.currentPort = port;

        // Initialize all metrics
        this.initializeMetrics();

        // Add default system metrics with a prefix to avoid conflicts
        collectDefaultMetrics({ 
            register: this.registry,
            prefix: 'playwright_',
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5] 
        });

        // Enable CORS for all routes
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            
            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
                return;
            }
            next();
        });

        // Basic middleware for logging and error handling
        this.app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip}`);
            next();
        });

        // Configure routes
        this.app.get('/metrics', async (req, res) => {
            try {
                const metrics = await this.registry.metrics();
                console.log(`[${new Date().toISOString()}] Metrics generated (${metrics.length} bytes)`);
                res.set('Content-Type', this.registry.contentType);
                res.send(metrics);
                
                // Reset keep-alive timer on each metrics request
                this.resetKeepAliveTimer();
            } catch (error) {
                console.error('[Metrics Error]:', error);
                res.status(500).json({ error: 'Failed to generate metrics' });
            }
        });

        // Add debug endpoint
        this.app.get('/debug', async (req, res) => {
            try {
                const metrics = await this.registry.getMetricsAsJSON();
                res.json({
                    requestInfo: {
                        ip: req.ip,
                        ips: req.ips,
                        protocol: req.protocol,
                        hostname: req.hostname,
                        path: req.path
                    },
                    serverInfo: {
                        port: this.currentPort,
                        addresses: this.getServerAddresses(),
                        keepAliveRemaining: this.keepAliveTimer ? 'active' : 'inactive'
                    },
                    metricsCount: metrics.length,
                    metrics: metrics.map(m => ({
                        name: m.name,
                        help: m.help,
                        type: m.type
                    }))
                });
            } catch (error) {
                console.error('[Debug Endpoint Error]:', error);
                res.status(500).json({ error: 'Failed to get metrics' });
            }
        });

        // Add health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                port: this.currentPort,
                metricsEnabled: true,
                addresses: this.getServerAddresses(),
                keepAliveRemaining: this.keepAliveTimer ? 'active' : 'inactive',
                requestInfo: {
                    ip: req.ip,
                    protocol: req.protocol,
                    hostname: req.hostname
                }
            });
        });

        // Reset metrics endpoint
        this.app.post('/reset-metrics', async (req, res) => {
            try {
                await this.resetMetrics();
                res.status(200).json({ message: 'Metrics reset successfully' });
            } catch (error) {
                console.error('[Metrics Reset Error]:', error);
                res.status(500).json({ error: 'Failed to reset metrics' });
            }
        });

        // Handle graceful shutdown
        process.on('SIGTERM', () => this.handleShutdown());
        process.on('SIGINT', () => this.handleShutdown());
    }

    private initializeMetrics() {
        // Initialize all metrics only if they don't exist
        if (!this.registry.getSingleMetric('playwright_tests_total')) {
            this.testCounter = new Counter({
                name: 'playwright_tests_total',
                help: 'Total number of tests run',
                labelNames: ['status', 'project', 'browser', 'suite'],
                registers: [this.registry]
            });
        }

        if (!this.registry.getSingleMetric('playwright_active_tests')) {
            this.activeTestsGauge = new Gauge({
                name: 'playwright_active_tests',
                help: 'Number of currently running tests',
                labelNames: ['browser', 'project', 'suite'],
                registers: [this.registry]
            });
        }

        if (!this.registry.getSingleMetric('playwright_test_duration_seconds')) {
            this.testDurationHistogram = new Histogram({
                name: 'playwright_test_duration_seconds',
                help: 'Test execution time',
                labelNames: ['testName', 'browser', 'status', 'project', 'suite'],
                buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10, 30],
                registers: [this.registry]
            });
        }

        if (!this.registry.getSingleMetric('playwright_test_steps_total')) {
            this.testStepCounter = new Counter({
                name: 'playwright_test_steps_total',
                help: 'Total number of test steps',
                labelNames: ['status', 'testName', 'stepName'],
                registers: [this.registry]
            });
        }

        if (!this.registry.getSingleMetric('playwright_test_suite_info')) {
            this.testSuiteGauge = new Gauge({
                name: 'playwright_test_suite_info',
                help: 'Information about the test suite execution',
                labelNames: ['project', 'browser', 'status'],
                registers: [this.registry]
            });
        }

        if (!this.registry.getSingleMetric('playwright_browser_metrics')) {
            this.browserMetricsGauge = new Gauge({
                name: 'playwright_browser_metrics',
                help: 'Browser-specific metrics during test execution',
                labelNames: ['metric', 'browser', 'project'],
                registers: [this.registry]
            });
        }

        if (!this.registry.getSingleMetric('playwright_test_errors_total')) {
            this.errorCounter = new Counter({
                name: 'playwright_test_errors_total',
                help: 'Total number of test errors by type',
                labelNames: ['errorType', 'browser', 'project', 'testName'],
                registers: [this.registry]
            });
        }

        if (!this.registry.getSingleMetric('playwright_memory_usage_bytes')) {
            this.memoryGauge = new Gauge({
                name: 'playwright_memory_usage_bytes',
                help: 'Memory usage during test execution',
                labelNames: ['browser', 'project', 'testName'],
                registers: [this.registry]
            });
        }
    }

    private async resetMetrics() {
        try {
            // Clear all existing metrics
            await this.registry.resetMetrics();
            
            // Re-initialize the metrics with zero values
            this.testCounter.reset();
            this.activeTestsGauge.reset();

            // Reinitialize the metrics system
            this.initializeMetrics();
            
            console.log('Successfully reset all metrics');
        } catch (error) {
            console.error('Error resetting metrics:', error);
            throw error;
        }
    }

    private resetKeepAliveTimer() {
        if (this.keepAliveTimer) {
            clearTimeout(this.keepAliveTimer);
        }
        
        this.keepAliveTimer = setTimeout(() => {
            console.log('Keep-alive timer expired, shutting down metrics server...');
            this.handleShutdown();
        }, MetricsServer.KEEP_ALIVE_DURATION);
    }

    private async findAvailablePort(startPort: number): Promise<number> {
        for (let port = startPort; port < startPort + MetricsServer.MAX_PORT_ATTEMPTS; port++) {
            try {
                await new Promise((resolve, reject) => {
                    const server = net.createServer()
                        .listen(port)
                        .once('listening', () => {
                            server.close();
                            resolve(port);
                        })
                        .once('error', (err: NodeJS.ErrnoException) => {
                            if (err.code === 'EADDRINUSE') {
                                resolve(null);
                            } else {
                                reject(err);
                            }
                        });
                });
                return port;
            } catch (err) {
                console.log(`Port ${port} check failed:`, err);
                continue;
            }
        }
        throw new Error(`No available ports found after ${MetricsServer.MAX_PORT_ATTEMPTS} attempts`);
    }

    static getInstance(port: number): MetricsServer {
        if (!MetricsServer.instance) {
            MetricsServer.instance = new MetricsServer(port);
        }
        return MetricsServer.instance;
    }

    getRegistry(): Registry {
        return this.registry;
    }

    getTestCounter(): Counter<string> {
        return this.testCounter;
    }

    getActiveTestsGauge(): Gauge<string> {
        return this.activeTestsGauge;
    }

    getTestDurationHistogram(): Histogram<string> {
        return this.testDurationHistogram;
    }

    getTestStepCounter(): Counter<string> {
        return this.testStepCounter;
    }

    getTestSuiteGauge(): Gauge<string> {
        return this.testSuiteGauge;
    }

    getBrowserMetricsGauge(): Gauge<string> {
        return this.browserMetricsGauge;
    }

    getErrorCounter(): Counter<string> {
        return this.errorCounter;
    }

    getMemoryGauge(): Gauge<string> {
        return this.memoryGauge;
    }

    async start(): Promise<void> {
        if (this.server) {
            console.log('Metrics server already running');
            return;
        }

        try {
            // Try to find an available port starting from the desired port
            this.currentPort = await this.findAvailablePort(this.port);
            console.log(`Using port ${this.currentPort} for metrics server`);

            return new Promise((resolve, reject) => {
                this.server = this.app.listen(this.currentPort, '0.0.0.0', () => {
                    const addresses = this.getServerAddresses();
                    console.log(`Metrics server listening on port ${this.currentPort}`);
                    console.log('Server addresses:', addresses);
                    console.log('Available endpoints:');
                    console.log('  - /metrics - Prometheus metrics');
                    console.log('  - /health  - Server health check');
                    console.log('  - /debug   - Debug information');
                    
                    // Start collecting metrics every 5 seconds
                    this.metricsInterval = setInterval(async () => {
                        try {
                            const metrics = await this.registry.metrics();
                            console.log(`[${new Date().toISOString()}] Metrics updated (${metrics.length} bytes)`);
                        } catch (error) {
                            console.error('[Metrics Collection Error]:', error);
                        }
                    }, 5000);

                    // Start the keep-alive timer
                    this.resetKeepAliveTimer();
                    
                    resolve();
                }).on('error', (error: NodeJS.ErrnoException) => {
                    console.error(`Failed to start server on port ${this.currentPort}:`, error);
                    reject(error);
                });

                // Log all incoming connections
                this.server.on('connection', (socket) => {
                    console.log(`[${new Date().toISOString()}] New connection from ${socket.remoteAddress}:${socket.remotePort}`);
                });
            });
        } catch (error) {
            console.error('[Startup Error]:', error);
            throw error;
        }
    }

    private getServerAddresses(): string[] {
        const addresses: string[] = [];
        const networkInterfaces = os.networkInterfaces();
        
        for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            if (interfaces) {  // Add null check for interfaces
                for (const iface of interfaces) {
                    // Include both internal and external IPv4 addresses for debugging
                    if (iface.family === 'IPv4') {
                        addresses.push(`${iface.address}:${this.currentPort}`);
                    }
                }
            }
        }
        
        return addresses;
    }

    private async handleShutdown() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        console.log('Received shutdown signal, cleaning up...');
        await this.close();
        process.exit(0);
    }

    async close(): Promise<void> {
        return new Promise<void>((resolve) => {
            const cleanup = () => {
                if (this.keepAliveTimer) {
                    clearTimeout(this.keepAliveTimer);
                    this.keepAliveTimer = null;
                }
                
                if (this.metricsInterval) {
                    clearInterval(this.metricsInterval);
                    this.metricsInterval = null;
                }
                
                this.registry.clear();
                
                if (this.server) {
                    this.server.close(() => {
                        this.server = null;
                        MetricsServer.instance = null;
                        console.log('Metrics server and resources cleaned up');
                        resolve();
                    });
                } else {
                    resolve();
                }
            };

            if (this.server) {
                this.server.getConnections((err, count) => {
                    if (count > 0) {
                        console.log(`Closing ${count} active connections...`);
                    }
                    cleanup();
                });
            } else {
                cleanup();
            }
        });
    }

    getCurrentPort(): number {
        return this.currentPort;
    }
}