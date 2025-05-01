#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables from .env file
set -a
source "$SCRIPT_DIR/.env"
set +a

# Export variables for Jenkins
export SMTP_HOST
export SMTP_PORT
export SMTP_USER
export SMTP_PASSWORD
export SMTP_FROM
export SMTP_TO
export SMTP_TLS
export SMTP_STARTTLS

# Print the loaded variables (for debugging)
echo "Environment variables loaded:"
echo "SMTP_HOST: $SMTP_HOST"
echo "SMTP_PORT: $SMTP_PORT"
echo "SMTP_USER: $SMTP_USER"
echo "SMTP_FROM: $SMTP_FROM"
echo "SMTP_TO: $SMTP_TO"
echo "SMTP_TLS: $SMTP_TLS"
echo "SMTP_STARTTLS: $SMTP_STARTTLS"