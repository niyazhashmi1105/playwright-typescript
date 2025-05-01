#!/bin/bash

# Exit on any error
set -e

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Run tests
npx playwright test

# Generate reports
npx playwright show-report

# Archive test results
mkdir -p test-results
cp -r playwright-report/* test-results/
cp -r test-results/* /var/jenkins_home/workspace/$JOB_NAME/