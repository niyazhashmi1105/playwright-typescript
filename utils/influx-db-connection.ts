import { InfluxDB, Point } from '@influxdata/influxdb-client';

// Environment variables
const token = process.env.INFLUX_TOKEN;
const url = process.env.INFLUX_URL || 'http://localhost:8086';
const org = process.env.INFLUX_ORG||'my_macbook_org';
const bucket = process.env.INFLUX_BUCKET || 'playwright_metrics';

// Create client
const client = new InfluxDB({ url, token });
const writeApi = client.getWriteApi(org, bucket);

// Create and write a test point
const point = new Point('test_connection')
  .tag('source', 'connection_test')
  .floatField('value', 1.0)
  .timestamp(new Date());

writeApi.writePoint(point);

// Close the client
writeApi.close()
  .then(() => console.log('Connection test successful!'))
  .catch(e => console.error('Error testing connection:', e));