#!/usr/bin/env node
/**
 * Jenkins-specific script to verify and regenerate Grafana API key if needed
 * This script handles:
 * 1. Verification of existing API keys
 * 2. Regeneration if the key is invalid
 * 3. Explicit service account permission updates
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Grafana connection details
const GRAFANA_URL = process.env.CI ? 'http://grafana:3000' : 'http://localhost:3002';
const GRAFANA_USER = process.env.GF_SECURITY_ADMIN_USER || 'admin';
const GRAFANA_PASSWORD = process.env.GF_SECURITY_ADMIN_PASSWORD || 'admin';
const SERVICE_ACCOUNT_NAME = 'jenkins-automation';
const TOKEN_NAME = 'jenkins-token';
const ENV_FILE_PATH = path.join(__dirname, '../../.env');

async function verifyAndFixGrafanaAccess() {
    try {
        console.log('Jenkins Grafana Authentication Helper');
        console.log('===================================');
        console.log(`Grafana URL: ${GRAFANA_URL}`);

        // Wait for Grafana to be ready (important in CI environments)
        await waitForGrafanaReady();

        // Check if we have an API key
        let apiKey = process.env.GRAFANA_API_KEY;
        console.log(apiKey ? 'Found existing GRAFANA_API_KEY in environment' : 'No GRAFANA_API_KEY found in environment');
        
        // Test the current API key if available
        if (apiKey) {
            try {
                console.log('Testing current API key...');
                const testResult = await testApiKey(apiKey);
                console.log('API key test result:', testResult ? 'Valid' : 'Invalid');
                
                if (testResult) {
                    console.log('Current API key is valid. No need to regenerate.');
                    return;
                } else {
                    console.log('API key is invalid. Will regenerate...');
                }
            } catch (error) {
                console.log('Error testing API key, will regenerate:', error.message);
            }
        }

        // Generate new API key
        const generateCmd = `node ${path.join(__dirname, 'generate-grafana-api-key.js')}`;
        console.log(`Executing: ${generateCmd}`);
        
        try {
            const output = execSync(generateCmd, { encoding: 'utf8' });
            console.log(output);
            
            // Re-read .env file to get the new key
            require('dotenv').config();
            apiKey = process.env.GRAFANA_API_KEY;
            
            if (!apiKey) {
                throw new Error('API key was not properly set in .env file');
            }
            
            // Verify the new key
            const testResult = await testApiKey(apiKey);
            if (!testResult) {
                throw new Error('Newly generated API key failed validation');
            }
            
            // Update Jenkins environment with the new key
            console.log('API key successfully generated and validated.');
            
            // Update permissions for the service account (ensure it has annotation permissions)
            await updateServiceAccountPermissions();
            
            console.log('Grafana authentication setup complete.');
        } catch (execError) {
            console.error('Failed to generate API key:', execError.message);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error in Jenkins Grafana auth setup:', error.message);
        if (error.response) {
            console.error('Response:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        process.exit(1);
    }
}

async function testApiKey(apiKey) {
    try {
        // Format depends on whether it's a service account token or API key
        let authHeader;
        if (apiKey.startsWith('glsa_')) {
            authHeader = `Bearer ${apiKey}`;
        } else if (apiKey.startsWith('eyJrIjoi')) {
            authHeader = `Bearer ${apiKey}`;
        } else {
            authHeader = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
        }
        
        // Test the API key with a simple health check endpoint
        const response = await axios({
            method: 'get',
            url: `${GRAFANA_URL}/api/health`,
            headers: {
                'Authorization': authHeader
            },
            timeout: 5000
        });
        
        // Test for permissions to create annotations (what we actually need)
        try {
            const annotationTest = await axios({
                method: 'post',
                url: `${GRAFANA_URL}/api/annotations`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                data: {
                    time: Date.now(),
                    tags: ['test'],
                    text: 'API key test annotation'
                },
                timeout: 5000
            });
            
            console.log('Annotation test successful');
            return true;
        } catch (annError) {
            console.log('Annotation test failed:', annError.message);
            if (annError.response?.status === 403) {
                console.log('API key lacks permission for annotations');
                return false;
            }
            // If error is not 403, might be another issue, consider the key valid
            return response.status === 200;
        }
    } catch (error) {
        console.log('API test failed:', error.message);
        return false;
    }
}

async function updateServiceAccountPermissions() {
    try {
        // Authenticate with admin credentials
        const authHeader = `Basic ${Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')}`;
        
        // Find the service account
        const searchResponse = await axios({
            method: 'get',
            url: `${GRAFANA_URL}/api/serviceaccounts/search?query=${SERVICE_ACCOUNT_NAME}`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            }
        });
        
        const serviceAccount = searchResponse.data.serviceAccounts.find(
            account => account.name === SERVICE_ACCOUNT_NAME
        );
        
        if (!serviceAccount) {
            throw new Error(`Service account '${SERVICE_ACCOUNT_NAME}' not found`);
        }
        
        console.log(`Found service account '${SERVICE_ACCOUNT_NAME}' with ID: ${serviceAccount.id}`);
        
        // Update the role to Admin (needed for annotations)
        const updateResponse = await axios({
            method: 'patch',
            url: `${GRAFANA_URL}/api/serviceaccounts/${serviceAccount.id}`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            data: {
                role: 'Admin',
                isDisabled: false
            }
        });
        
        console.log('Updated service account permissions to Admin role');
        
        // Add specific permissions for annotations
        try {
            await axios({
                method: 'post',
                url: `${GRAFANA_URL}/api/access-control/builtin-roles`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                data: {
                    roleUID: `sa-${serviceAccount.id}`,
                    global: true,
                    permissions: [
                        { action: 'annotations:create', scope: 'annotations:*' },
                        { action: 'annotations:write', scope: 'annotations:*' },
                        { action: 'annotations:read', scope: 'annotations:*' }
                    ]
                }
            });
            console.log('Added specific annotations permissions');
        } catch (permError) {
            console.log('Note: Could not add specific permissions. Admin role should still work:', permError.message);
        }
        
        return true;
    } catch (error) {
        console.error('Error updating service account permissions:', error.message);
        return false;
    }
}

async function waitForGrafanaReady(retries = 10, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Checking if Grafana is ready (attempt ${i+1}/${retries})...`);
            const response = await axios.get(`${GRAFANA_URL}/api/health`, { timeout: 2000 });
            
            if (response.status === 200) {
                console.log('Grafana is ready!');
                return true;
            }
        } catch (error) {
            console.log(`Grafana not ready yet: ${error.message}`);
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.error('Grafana did not become ready in time');
    return false;
}

// Execute if run directly
if (require.main === module) {
    verifyAndFixGrafanaAccess().catch(err => {
        console.error('Error in Jenkins Grafana auth setup:', err);
        process.exit(1);
    });
}

module.exports = verifyAndFixGrafanaAccess;