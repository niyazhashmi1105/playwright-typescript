#!/bin/bash

echo "Checking service health..."

# Check if metrics endpoint is accessible
echo "Testing metrics endpoint..."
curl -s http://localhost:9323/health
if [ $? -eq 0 ]; then
    echo "✅ Metrics server is healthy"
    echo "Fetching current metrics..."
    curl -s http://localhost:9323/metrics
else
    echo "❌ Metrics server is not responding"
fi

echo -e "\nChecking Prometheus connection..."
curl -s http://localhost:9090/-/healthy
if [ $? -eq 0 ]; then
    echo "✅ Prometheus is healthy"
    echo "Checking Prometheus targets..."
    curl -s http://localhost:9090/api/v1/targets | grep "test-runner"
else
    echo "❌ Prometheus is not responding"
fi