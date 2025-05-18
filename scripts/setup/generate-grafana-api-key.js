require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Use Docker service name when running in CI/Docker
const GRAFANA_URL = process.env.CI ? 'http://grafana:3000' : 'http://localhost:3002';
const GRAFANA_USER = process.env.GF_SECURITY_ADMIN_USER || 'admin';
const GRAFANA_PASSWORD = process.env.GF_SECURITY_ADMIN_PASSWORD || 'admin';
const ENV_FILE_PATH = path.join(__dirname, '../../.env');
const SERVICE_ACCOUNT_NAME = 'jenkins-automation';
const TOKEN_NAME = 'jenkins-token';

async function generateGrafanaApiKey() {
    try {
        console.log('Generating Grafana service account token...');
        
        // Basic auth for API calls
        const authHeader = `Basic ${Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')}`;
        
        // First check if service account already exists
        console.log('Checking for existing service accounts...');
        let serviceAccountId;
        
        try {
            const existingAccounts = await axios({
                method: 'get',
                url: `${GRAFANA_URL}/api/serviceaccounts/search?query=${SERVICE_ACCOUNT_NAME}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                }
            });
            
            const existingAccount = existingAccounts.data.serviceAccounts.find(
                account => account.name === SERVICE_ACCOUNT_NAME
            );
            
            if (existingAccount) {
                console.log(`Service account '${SERVICE_ACCOUNT_NAME}' already exists with ID: ${existingAccount.id}`);
                serviceAccountId = existingAccount.id;
            }
        } catch (error) {
            console.log('Error checking for existing service accounts, will try to create a new one:', error.message);
        }
        
        // Step 1: Create a service account if it doesn't exist
        if (!serviceAccountId) {
            console.log('Creating service account...');
            try {
                const saResponse = await axios({
                    method: 'post',
                    url: `${GRAFANA_URL}/api/serviceaccounts`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    },
                    data: {
                        name: SERVICE_ACCOUNT_NAME,
                        role: 'Editor',
                        isDisabled: false
                    }
                });

                serviceAccountId = saResponse.data.id;
                console.log(`Service account created with ID: ${serviceAccountId}`);
            } catch (error) {
                if (error.response && error.response.data && error.response.data.message) {
                    if (error.response.data.message.includes('already exists')) {
                        console.log('Service account name collision. Trying to fetch the existing account...');
                        
                        // If name collision, try to get the ID again with a more targeted search
                        const retrySearch = await axios({
                            method: 'get',
                            url: `${GRAFANA_URL}/api/serviceaccounts/search?query=${SERVICE_ACCOUNT_NAME}&limit=100`,
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': authHeader
                            }
                        });
                        
                        const existingAccount = retrySearch.data.serviceAccounts.find(
                            account => account.name === SERVICE_ACCOUNT_NAME
                        );
                        
                        if (existingAccount) {
                            serviceAccountId = existingAccount.id;
                            console.log(`Found existing service account with ID: ${serviceAccountId}`);
                        } else {
                            throw new Error('Could not find or create service account');
                        }
                    } else {
                        throw error;
                    }
                } else {
                    throw error;
                }
            }
        }

        if (!serviceAccountId) {
            throw new Error('Failed to determine service account ID');
        }

        // Step 2: Check if token already exists
        console.log('Checking for existing tokens...');
        let shouldCreateToken = true;
        let uniqueTokenName = TOKEN_NAME;
        
        try {
            const existingTokens = await axios({
                method: 'get',
                url: `${GRAFANA_URL}/api/serviceaccounts/${serviceAccountId}/tokens`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                }
            });
            
            if (existingTokens.data && existingTokens.data.length > 0) {
                const existingToken = existingTokens.data.find(token => token.name === TOKEN_NAME);
                if (existingToken) {
                    console.log(`Token '${TOKEN_NAME}' already exists. Creating new token with unique name...`);
                    // Generate a unique name with timestamp
                    uniqueTokenName = `${TOKEN_NAME}-${Date.now()}`;
                }
            }
        } catch (error) {
            console.log('Error checking existing tokens, will try to create a new one:', error.message);
        }

        // Step 3: Create a token with a unique name
        console.log(`Creating service account token with name: ${uniqueTokenName}...`);
        let apiKey;
        try {
            const tokenResponse = await axios({
                method: 'post',
                url: `${GRAFANA_URL}/api/serviceaccounts/${serviceAccountId}/tokens`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                data: {
                    name: uniqueTokenName,
                    secondsToLive: 86400 * 365 // 1 year expiration
                }
            });

            apiKey = tokenResponse.data.key;
            console.log('Service account token generated successfully!');
        } catch (error) {
            // If there's an error about the token name already existing
            if (error.response && error.response.data && 
                error.response.data.messageId === 'serviceaccounts.ErrTokenAlreadyExists') {
                
                console.log('Token name already exists. Creating token with a unique name...');
                // Try again with a timestamp appended to make the name unique
                const retryTokenName = `${TOKEN_NAME}-${Date.now()}`;
                
                const retryResponse = await axios({
                    method: 'post',
                    url: `${GRAFANA_URL}/api/serviceaccounts/${serviceAccountId}/tokens`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    },
                    data: {
                        name: retryTokenName,
                        secondsToLive: 86400 * 365 // 1 year expiration
                    }
                });
                
                apiKey = retryResponse.data.key;
                console.log(`Service account token '${retryTokenName}' generated successfully!`);
            } else {
                throw error;
            }
        }

        if (!apiKey) {
            throw new Error('Failed to generate API key');
        }
        
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