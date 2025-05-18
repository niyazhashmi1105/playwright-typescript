#!/bin/bash

# Exit on any error
set -e

# Load environment variables
. ${WORKSPACE}/jenkins/jenkins-env-loader.sh || true

# Ensure clean directories
rm -rf playwright-report/* || true
rm -rf test-results/* || true
mkdir -p playwright-report
mkdir -p test-results

# Set CI environment variable
export CI=true
echo "Running in CI environment"

# Install dependencies
echo "Installing dependencies..."
npm install

# Install Playwright browsers
echo "Installing Playwright browsers..."
npx playwright install

# Run tests
echo "Running tests..."
PLAYWRIGHT_HTML_REPORT=playwright-report npm run test:all || true

# Set Jenkins-friendly permissions
echo "Setting permissions..."
chown -R 1000:1000 playwright-report test-results || true
chmod -R 775 playwright-report test-results || true

# Verify report exists
if [ ! -f "playwright-report/index.html" ]; then
    echo "ERROR: HTML report was not generated!"
    mkdir -p playwright-report
    echo "<html><body><h1>Test Execution Failed</h1><p>No test results available.</p></body></html>" > playwright-report/index.html
    chmod 664 playwright-report/index.html
fi

# Additional debug information
echo "Debug: Listing report directory contents"
ls -la playwright-report/

# Run post-test processing with proper environment
echo "Running post-test processing..."
CI=true npm run post:test || true

echo "Build script completed"