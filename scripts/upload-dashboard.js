require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3002';
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;

if (!GRAFANA_API_KEY) {
    console.error('Error: GRAFANA_API_KEY environment variable is required');
    process.exit(1);
}

async function uploadDashboard() {
    const dashboardPath = path.join(__dirname, '..', 'grafana', 'dashboard.json');
    
    // Check if dashboard file exists
    if (!fs.existsSync(dashboardPath)) {
        throw new Error(`Dashboard file not found at ${dashboardPath}`);
    }

    try {
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
            
            req.on('error', reject);
            req.write(JSON.stringify(payload));
            req.end();
        });
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in dashboard file: ${error.message}`);
        }
        throw error;
    }
}

// Export the function
module.exports = uploadDashboard;