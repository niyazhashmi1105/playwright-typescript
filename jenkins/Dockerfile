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
    libharfbuzz-icu0 \
    libxslt1.1 \
    libwoff1 \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    flite1-dev \
    libwebp-dev \
    libenchant-2-2 \
    libsecret-1-0 \
    libhyphen0 \
    libmanette-0.2-0 \
    libgles2 \
    x264

# Install Playwright
RUN npm init -y && \
    npm install -g playwright && \
    npx playwright install && \
    npx playwright install-deps

# Create directory for environment files
RUN mkdir -p /var/jenkins_home/environment

# Copy environment files
COPY .env /var/jenkins_home/environment/
COPY jenkins-env-loader.sh /var/jenkins_home/environment/

# Make the loader script executable
RUN chmod +x /var/jenkins_home/environment/jenkins-env-loader.sh

# Install Jenkins plugins including metrics
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins

# Enable Prometheus metrics endpoint
ENV JENKINS_OPTS="--httpPort=8080 --prefix=/jenkins"
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Dhudson.model.UsageStatistics.disabled=true -Djenkins.metrics.prometheus.path=/prometheus -Djenkins.metrics.api.enabled=true"