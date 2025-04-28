import express from 'express';
import { Registry, collectDefaultMetrics } from 'prom-client';

export class MetricsServer {
    private app = express();
    private registry: Registry;
    private port: number;
    private server: any;

    constructor(port: number = 9323) {
        this.port = port;
        this.registry = new Registry();
        collectDefaultMetrics({ register: this.registry });

        // Add endpoint for metrics
        this.app.get('/metrics', async (req: express.Request, res: express.Response): Promise<void> => {
            res.setHeader('Content-Type', this.registry.contentType);
            const metrics: string = await this.registry.metrics();
            res.send(metrics);
        });

        // Add a health check endpoint
        this.app.get('/health', (req: express.Request, res: express.Response) => {
            res.status(200).send('OK');
        });
    }

    public getRegistry(): Registry {
        return this.registry;
    }

    public start(): void {
        const tryPort = (port: number): Promise<number> => {
            return new Promise((resolve, reject) => {
                const server = this.app.listen(port, '0.0.0.0')
                    .once('listening', () => {
                        this.server = server;
                        resolve(port);
                    })
                    .once('error', (err: any) => {
                        if (err.code === 'EADDRINUSE') {
                            // Try next port
                            resolve(tryPort(port + 1));
                        } else {
                            reject(err);
                        }
                    });
            });
        };

        tryPort(this.port)
            .then(actualPort => {
                console.log(`Metrics server listening at http://localhost:${actualPort}/metrics`);
                // Update Prometheus target if needed
                if (actualPort !== this.port) {
                    console.log(`Note: Using port ${actualPort} instead of configured port ${this.port}`);
                }
            })
            .catch(error => {
                console.error(`Failed to start metrics server: ${error.message}`);
            });
    }

    public async close(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}