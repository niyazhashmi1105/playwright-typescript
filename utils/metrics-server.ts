import express from 'express';
import { Registry, collectDefaultMetrics } from 'prom-client';

export class MetricsServer {
    private app = express();
    private registry: Registry;
    private port: number;

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
    }

    public getRegistry(): Registry {
        return this.registry;
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`Metrics server listening on port ${this.port}`);
        });
    }
}