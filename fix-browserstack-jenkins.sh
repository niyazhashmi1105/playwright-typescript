#!/bin/bash

# This script fixes the BrowserStack plugin configuration in Jenkins

# Define your job name - replace "PlaywrightTests" with your actual job name if different
JOB_NAME="PlaywrightTests"
JOB_CONFIG_PATH="/var/jenkins_home/jobs/${JOB_NAME}/config.xml"

# Back up the existing configuration
cp "${JOB_CONFIG_PATH}" "${JOB_CONFIG_PATH}.bak"

# Replace any malformed BrowserStack configuration with a correct one
# This uses sed to find and replace the BrowserStack plugin configuration section
sed -i 's|<credentialsId>.*</credentialsId>|<credentialsId>browserstack-credentials</credentialsId>|g' "${JOB_CONFIG_PATH}"
sed -i 's|<browserStackLocalEnabled>.*</browserStackLocalEnabled>|<browserStackLocalEnabled>true</browserStackLocalEnabled>|g' "${JOB_CONFIG_PATH}"
sed -i 's|<browserStackLocalPath>.*</browserStackLocalPath>|<browserStackLocalPath>/var/jenkins_home/browserstack-local/BrowserStackLocal</browserStackLocalPath>|g' "${JOB_CONFIG_PATH}"

echo "Jenkins BrowserStack configuration has been updated. You may need to reload Jenkins configuration"