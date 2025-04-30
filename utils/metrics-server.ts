import express from 'express';
import { Server } from 'http';
import { register, Registry, collectDefaultMetrics, Counter, Gauge } from 'prom-client';
import net from 'net';

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
    private testCounter: Counter;
    private activeTestsGauge: Gauge;

    private constructor(private port: number) {
        this.app = express();
        this.server = null;
        this.registry = new Registry();
        this.metricsInterval = null;
        this.keepAliveTimer = null;
        this.currentPort = port;

        console.log('Initializing metrics server...');
        
        // Initialize test metrics
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
        // Check if metrics already exist before creating new ones
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
    }

    private async resetMetrics() {
        await this.registry.resetMetrics();
        this.initializeMetrics();
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

    static getInstance(port: number): MetricsServer {
        if (!MetricsServer.instance) {
            MetricsServer.instance = new MetricsServer(port);
        }
        return MetricsServer.instance;
    }

    getRegistry(): Registry {
        return this.registry;
    }

    async start(): Promise<void> {
        if (this.server) {
            console.log('Metrics server already running');
            return;
        }

        try {
            return new Promise((resolve, reject) => {
                // Listen on all interfaces to ensure Docker container access
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
                    if (error.code === 'EADDRINUSE') {
                        console.error(`Port ${this.currentPort} is already in use. Please ensure no other process is using this port.`);
                    }
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
        const networkInterfaces = require('os').networkInterfaces();
        
        for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            for (const iface of interfaces) {
                // Include both internal and external IPv4 addresses for debugging
                if (iface.family === 'IPv4') {
                    addresses.push(`${iface.address}:${this.currentPort}`);
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