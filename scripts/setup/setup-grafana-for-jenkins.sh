#!/bin/bash

# Script to set up Grafana API key for Jenkins during deployment
# This should be run after Grafana is started but before Jenkins needs to interact with it

set -e

echo "Setting up Grafana API key for Jenkins..."

# Ensure we have Node.js and npm available
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

# Wait for Grafana to be ready
echo "Waiting for Grafana to be available..."
GRAFANA_URL="${CI:+http://grafana:3000}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3002}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "$GRAFANA_URL/api/health" | grep -q "ok"; then
        echo "Grafana is ready!"
        break
    fi
    echo "Grafana not ready yet, retrying in 5 seconds..."
    sleep 5
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Failed to connect to Grafana after multiple attempts. Please check if Grafana is running."
    exit 1
fi

# Generate Grafana API key
echo "Generating Grafana API key..."
node "$(dirname "$0")/generate-grafana-api-key.js"

# Verify that we have an API key
if [ -z "$GRAFANA_API_KEY" ] && [ -f .env ]; then
    # Export from .env file if present
    export $(grep -v '^#' .env | grep GRAFANA_API_KEY)
fi

if [ -z "$GRAFANA_API_KEY" ]; then
    echo "Warning: GRAFANA_API_KEY is not set. API key generation may have failed."
    echo "Jenkins might experience authentication issues with Grafana."
else
    echo "Grafana API key is configured and ready for Jenkins!"
fi

echo "Grafana setup for Jenkins completed."