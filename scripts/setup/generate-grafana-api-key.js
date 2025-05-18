require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Use Docker service name when running in CI/Docker
const GRAFANA_URL = process.env.CI ? 'http://grafana:3000' : 'http://localhost:3002';
const GRAFANA_USER = process.env.GF_SECURITY_ADMIN_USER || 'admin';
const GRAFANA_PASSWORD = process.env.GF_SECURITY_ADMIN_PASSWORD || 'admin';
const ENV_FILE_PATH = path.join(__dirname, '../../.env');

async function generateGrafanaApiKey() {
    try {
        console.log('Generating Grafana service account token...');
        
        // Basic auth for API calls
        const authHeader = `Basic ${Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')}`;
        
        // Step 1: Create a service account
        console.log('Creating service account...');
        const saResponse = await axios({
            method: 'post',
            url: `${GRAFANA_URL}/api/serviceaccounts`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            data: {
                name: 'jenkins-automation',
                role: 'Editor',
                isDisabled: false
            }
        });

        if (saResponse.status !== 201) {
            throw new Error(`Failed to create service account: ${saResponse.status} ${saResponse.statusText}`);
        }

        const serviceAccountId = saResponse.data.id;
        console.log(`Service account created with ID: ${serviceAccountId}`);

        // Step 2: Create a token for the service account
        console.log('Creating service account token...');
        const tokenResponse = await axios({
            method: 'post',
            url: `${GRAFANA_URL}/api/serviceaccounts/${serviceAccountId}/tokens`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            data: {
                name: 'jenkins-token',
                secondsToLive: 86400 * 365 // 1 year expiration
            }
        });

        if (tokenResponse.status !== 200) {
            throw new Error(`Failed to create service account token: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }

        const apiKey = tokenResponse.data.key;
        console.log('Service account token generated successfully!');
        
        // Update .env file with the new API key
        let envContent = '';
        
        if (fs.existsSync(ENV_FILE_PATH)) {
            envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
            
            // Replace existing API key if present
            if (envContent.includes('GRAFANA_API_KEY=')) {
                envContent = envContent.replace(/GRAFANA_API_KEY=.*\n/g, `GRAFANA_API_KEY=${apiKey}\n`);
            } else {
                // Add new API key if not present
                envContent += `\nGRAFANA_API_KEY=${apiKey}\n`;
            }
        } else {
            envContent = `GRAFANA_API_KEY=${apiKey}\n`;
        }
        
        fs.writeFileSync(ENV_FILE_PATH, envContent);
        console.log(`API key has been added to ${ENV_FILE_PATH}`);
        console.log('You can now use this key for Jenkins authentication to Grafana');
        
        return apiKey;
    } catch (error) {
        console.error('Failed to generate Grafana API key:', error.message);
        if (error.response) {
            console.error('Response:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        throw error;
    }
}

// Execute if run directly
if (require.main === module) {
    generateGrafanaApiKey().catch(err => {
        console.error('Error in API key generation:', err);
        process.exit(1);
    });
}

module.exports = generateGrafanaApiKey;