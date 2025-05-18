#!/bin/bash

# Create directory for BrowserStack binary if it doesn't exist
mkdir -p /var/jenkins_home/browserstack-local

# Download the BrowserStack Local binary for Linux
curl -L "https://www.browserstack.com/browserstack-local/BrowserStackLocal-linux-x64.zip" -o /var/jenkins_home/browserstack-local.zip

# Unzip the binary
unzip -o /var/jenkins_home/browserstack-local.zip -d /var/jenkins_home/browserstack-local

# Make the binary executable
chmod +x /var/jenkins_home/browserstack-local/BrowserStackLocal

echo "BrowserStack Local binary has been set up successfully"
