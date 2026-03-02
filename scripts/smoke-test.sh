#!/bin/bash
# HIREAPP SMOKE TEST SCRIPT
# Run immediately after swapping traffic to Green environment

API_URL=${1:-"https://api.hireapp.com"}
WEB_URL=${2:-"https://hireapp.com"}
EXPECTED_API_STATUS="200"

echo "💨 Starting Smoke Tests for Environment: $API_URL"

# 1. Check API Health
echo "Testing API Health Endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")
if [ "$STATUS" -ne "$EXPECTED_API_STATUS" ]; then
    echo "❌ API Health Check Failed! Status: $STATUS"
    exit 1
fi
echo "✅ API Health Check Passed."

# 2. Check Marketing Site
echo "Testing Marketing Site..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL")
if [ "$STATUS" -ne "200" ]; then
    echo "❌ Marketing Site is down! Status: $STATUS"
    exit 1
fi
echo "✅ Marketing Site Passed."

# 3. Simulate critical path (e.g. attempting to fetch jobs anonymously)
# Note: Real scenario requires auth or testing an open route.
echo "Testing Core Job Fetch Route..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/jobs")
if [ "$STATUS" -eq "500" ]; then
    echo "❌ Core DB Route Failed! Trigger Rollback."
    exit 1
fi
echo "✅ Core DB Route Passed (Code $STATUS accepted missing auth / normal logic)."

echo "🎉 All Smoke Tests Passed. Deployment stabilizes."
exit 0
