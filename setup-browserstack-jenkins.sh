#!/bin/bash

# Create directory for BrowserStack binary
mkdir -p /var/jenkins_home/browserstack-local

# Download the Linux version of BrowserStack Local binary
curl -o /var/jenkins_home/browserstack-local.zip https://www.browserstack.com/browserstack-local/BrowserStackLocal-linux-x64.zip

# Unzip the binary to the appropriate directory
unzip -o /var/jenkins_home/browserstack-local.zip -d /var/jenkins_home/browserstack-local

# Make the binary executable
chmod +x /var/jenkins_home/browserstack-local/BrowserStackLocal

# Ensure proper ownership and permissions
chown -R jenkins:jenkins /var/jenkins_home/browserstack-local
chmod -R 755 /var/jenkins_home/browserstack-local

# Verify the binary exists and has execute permissions
ls -la /var/jenkins_home/browserstack-local/

echo "BrowserStack Local binary has been set up successfully"
