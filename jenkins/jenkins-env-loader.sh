#!/bin/bash

# Function to load env file
load_env_file() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        echo "Loading environment variables from $env_file"
        while IFS='=' read -r key value || [ -n "$key" ]; do
            # Skip comments and empty lines
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            
            # Remove any leading/trailing whitespace and quotes
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
            
            if [ ! -z "$key" ] && [ ! -z "$value" ]; then
                # Export the variable
                export "$key=$value"
                echo "Loaded: $key"
            fi
        done < "$env_file"
    else
        echo "Warning: $env_file not found"
    fi
}

# Try to load environment variables from multiple locations
WORKSPACE_ROOT="${WORKSPACE:-$(pwd)}"
ROOT_ENV="$WORKSPACE_ROOT/.env"
JENKINS_ENV="$WORKSPACE_ROOT/jenkins/.env"

# Load from root directory first
load_env_file "$ROOT_ENV"

# Then load from jenkins directory (will override if same variables exist)
load_env_file "$JENKINS_ENV"

# Verify SMTP variables are set
echo "Verifying SMTP Configuration:"
echo "SMTP_HOST: ${SMTP_HOST}"
echo "SMTP_PORT: ${SMTP_PORT}"
echo "SMTP_USER: ${SMTP_USER}"
echo "SMTP_FROM: ${SMTP_FROM}"
echo "SMTP_TO: ${SMTP_TO}"
echo "SMTP_TLS: ${SMTP_TLS}"
echo "SMTP_STARTTLS: ${SMTP_STARTTLS}"