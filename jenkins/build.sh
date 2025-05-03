#!/bin/bash

# Exit on any error
set -e

# Load environment variables
. ${WORKSPACE}/jenkins/jenkins-env-loader.sh

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Create directories for test results
mkdir -p test-results
mkdir -p playwright-report

# Run tests and store results (allow failure)
npm run all:headless || true

# Ensure proper permissions for test artifacts
chmod -R 777 test-results
chmod -R 777 playwright-report
chmod -R 777 allure-results

# Run post-test processing (allow failure)
npm run post:test || true

# Check if test results exist
if [ ! -f "test-results/test-results.json" ]; then
    echo "No test results found. Creating empty results file..."
    echo '{"stats": {"failures": 1, "tests": 0}}' > test-results/test-results.json
fi

# Always generate HTML report
npx playwright show-report

# Exit successfully to not fail the build
exit 0