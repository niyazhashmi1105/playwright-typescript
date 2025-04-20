# Use Node.js LTS slim image for reduced attack surface
FROM node:lts-slim

# Set working directory
WORKDIR /app

# Install curl and required dependencies for Playwright
RUN apt-get update && \
    apt-get install -y curl wget gnupg && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright and browsers with dependencies
RUN npx playwright install --with-deps chromium

# Copy the rest of the application
COPY . .

# Create directory for reports
RUN mkdir -p my-report

# Expose metrics port
EXPOSE 9323

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9323/health || exit 1

# Set environment variables
ENV METRICS_PORT=9323
ENV NODE_ENV=production

# Set the default command to run tests
CMD ["npm", "run", "all:headless"]