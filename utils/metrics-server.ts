import express from 'express';
import { Registry, collectDefaultMetrics } from 'prom-client';

export class MetricsServer {
    private app = express();
    private registry: Registry;
    private port: number;
    private server: any;

    constructor(port: number = 9323) {  // Explicitly set default port to 9323
        this.port = port;
        this.registry = new Registry();
        collectDefaultMetrics({ register: this.registry });

        // Add endpoint for metrics
        this.app.get('/metrics', async (req: express.Request, res: express.Response): Promise<void> => {
            console.log('Metrics endpoint accessed');
            res.setHeader('Content-Type', this.registry.contentType);
            const metrics: string = await this.registry.metrics();
            res.send(metrics);
        });

        // Add a health check endpoint
        this.app.get('/health', (req: express.Request, res: express.Response) => {
            console.log('Health check endpoint called');
            res.status(200).send('OK');
        });
    }

    public getRegistry(): Registry {
        return this.registry;
    }

    public start(): void {
        try {
            this.server = this.app.listen(this.port, '0.0.0.0', () => {
                console.log(`Metrics server listening at http://localhost:${this.port}/metrics`);
            });
        } catch (error) {
            console.error(`Failed to start metrics server: ${error.message}`);
        }
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