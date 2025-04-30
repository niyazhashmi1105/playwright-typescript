import { MetricsServer } from './utils/metrics-server';

async function globalSetup() {
  const port = parseInt(process.env.METRICS_PORT || '9323');
  const metricsServer = MetricsServer.getInstance(port);
  await metricsServer.start();
}

export default globalSetup;