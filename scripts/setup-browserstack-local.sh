#!/bin/bash

# Install browserstack-node-sdk globally to ensure it's available
npm install -g browserstack-node-sdk@latest

# Create directory for BrowserStack binary if it doesn't exist
mkdir -p /var/jenkins_home/browserstack-local

# Download the BrowserStack Local binary for Linux
curl -L "https://www.browserstack.com/browserstack-local/BrowserStackLocal-linux-x64.zip" -o /var/jenkins_home/browserstack-local.zip

# Unzip the binary
unzip -o /var/jenkins_home/browserstack-local.zip -d /var/jenkins_home/browserstack-local

# Make the binary executable
chmod +x /var/jenkins_home/browserstack-local/BrowserStackLocal

# Set environment variable for the BrowserStack binary path
echo "export BROWSERSTACK_LOCAL_BINARY_PATH=/var/jenkins_home/browserstack-local/BrowserStackLocal" >> $HOME/.bashrc
echo "export BROWSERSTACK_LOCAL_BINARY_PATH=/var/jenkins_home/browserstack-local/BrowserStackLocal" >> $HOME/.profile

# Create a symlink to ensure the binary is in the PATH
ln -sf /var/jenkins_home/browserstack-local/BrowserStackLocal /usr/local/bin/BrowserStackLocal

echo "BrowserStack Local binary and SDK have been set up successfully"