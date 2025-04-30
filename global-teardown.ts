import { MetricsServer } from './utils/metrics-server';

async function globalTeardown() {
  // Only close the server if we're shutting down the entire process
  if (process.env.NODE_ENV === 'CI' || process.env.CLEANUP_METRICS === 'true') {
    const port = parseInt(process.env.METRICS_PORT || '9323');
    const metricsServer = MetricsServer.getInstance(port);
    await metricsServer.close();
  }
}

export default globalTeardown;