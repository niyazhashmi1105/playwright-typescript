# Use Node.js LTS as base image
FROM node:lts

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Install Playwright and browsers with dependencies
RUN npx playwright install --with-deps

# Copy the rest of the application
COPY . .

# Create directory for reports
RUN mkdir -p my-report

# Set the default command to run tests
CMD ["npm", "run", "all:headless"]