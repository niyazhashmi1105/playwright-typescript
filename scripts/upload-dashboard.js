require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3000';
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;

if (!GRAFANA_API_KEY) {
    console.error('Error: GRAFANA_API_KEY environment variable is required');
    process.exit(1);
}

async function uploadDashboard() {
    const dashboardPath = path.join(__dirname, '..', 'grafana', 'dashboard.json');
    const dashboardJson = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    
    // Prepare dashboard payload
    const payload = {
        dashboard: dashboardJson,
        overwrite: true,
        message: 'Dashboard updated via API'
    };

    const options = {
        hostname: new URL(GRAFANA_URL).hostname,
        port: new URL(GRAFANA_URL).port || (GRAFANA_URL.startsWith('https') ? 443 : 80),
        path: '/api/dashboards/db',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GRAFANA_API_KEY}`
        }
    };

    return new Promise((resolve, reject) => {
        const reqLib = GRAFANA_URL.startsWith('https') ? https : http;
        const req = reqLib.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('Dashboard uploaded successfully!');
                    console.log(data);
                    resolve(data);
                } else {
                    reject(new Error(`Failed to upload dashboard: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify(payload));
        req.end();
    });
}

uploadDashboard().catch(error => {
    console.error(error);
    process.exit(1);
});