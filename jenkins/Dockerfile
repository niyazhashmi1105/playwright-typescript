FROM jenkins/jenkins:lts

USER root

# Install required dependencies
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    software-properties-common

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libgtk-4-1 \
    libavif15 \
    fonts-liberation \
    libvpx7 \
    libevent-2.1-7 \
    libopus0 \
    libharfbuzz-icu0

# Install Playwright
RUN npm init -y && \
    npm install -g playwright && \
    npx playwright install-deps chromium && \
    npx playwright install chromium

USER jenkins