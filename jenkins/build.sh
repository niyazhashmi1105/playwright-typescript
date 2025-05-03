#!/bin/bash

# Exit on any error
set -e

# Load environment variables
. ${WORKSPACE}/jenkins/jenkins-env-loader.sh

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run tests and store results
npm run all:headless

# Copy test results to ensure proper permissions
mkdir -p test-results
cp -r test-results/* ${WORKSPACE}/test-results/ || true
chmod -R 777 ${WORKSPACE}/test-results

# Copy playwright report
mkdir -p playwright-report
cp -r playwright-report/* ${WORKSPACE}/playwright-report/ || true
chmod -R 777 ${WORKSPACE}/playwright-report

# Run post-test processing
npm run post:test