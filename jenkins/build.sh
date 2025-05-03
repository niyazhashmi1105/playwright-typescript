#!/bin/bash

# Exit on any error
set -e

# Load environment variables
. ${WORKSPACE}/jenkins/jenkins-env-loader.sh

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Create directories
mkdir -p test-results
mkdir -p playwright-report

# Run tests (allow failure but capture exit code)
npm run all:headless
TEST_EXIT_CODE=$?

# Generate static HTML report (don't serve it)
npx playwright show-report --no-server > /dev/null 2>&1

# Set permissions
chmod -R 777 playwright-report
chmod -R 777 test-results

# Run post-test processing
npm run post:test || true

# Exit with original test exit code
exit ${TEST_EXIT_CODE}