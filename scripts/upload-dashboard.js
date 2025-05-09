require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Use Docker service name when running in CI/Docker
const GRAFANA_URL = process.env.CI ? 'http://grafana:3000' : 'http://localhost:3002';
// Hardcode credentials for reliability
const GRAFANA_USER = 'admin';
const GRAFANA_PASSWORD = 'admin';

async function uploadDashboard() {
    const dashboardPath = path.join(__dirname, '..', 'grafana', 'dashboards', 'consolidated-dashboard.json');
    
    // Check if dashboard file exists
    if (!fs.existsSync(dashboardPath)) {
        throw new Error(`Dashboard file not found at ${dashboardPath}`);
    }

    try {
        console.log('Uploading dashboard to Grafana at:', GRAFANA_URL);
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
            }
        };

        // Use basic auth with hardcoded admin credentials
        const auth = Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64');
        options.headers['Authorization'] = `Basic ${auth}`;
        console.log('Using basic auth authentication for Grafana');

        return new Promise((resolve, reject) => {
            const reqLib = GRAFANA_URL.startsWith('https') ? https : http;
            const req = reqLib.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log('Dashboard uploaded successfully!');
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`Failed to upload dashboard: ${res.statusCode} ${data}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error('Network error:', error.message);
                console.error('Target Grafana URL:', GRAFANA_URL);
                reject(error);
            });
            req.write(JSON.stringify(payload));
            req.end();
        });
    } catch (error) {
        console.error('Error during dashboard upload:', error.message);
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in dashboard file: ${error.message}`);
        }
        throw error;
    }
}

// Export the function
module.exports = uploadDashboard;