#!/bin/bash

# Performance test - send multiple notifications rapidly
BASE_URL="http://localhost:3007/api"
USER_ID="perf-test-user"
PHONE="+1234567890"

echo "⚡ Performance Test - Sending 10 notifications rapidly..."

# Setup user
curl -s -X POST "$BASE_URL/preferences" \
  -H "Content-Type: application/json" \
  -d '{"userId":"'$USER_ID'","phone":"'$PHONE'","smsEnabled":true,"orderNotifications":true}' > /dev/null

# Send 10 notifications as fast as possible
for i in {1..10}; do
  curl -s -X POST "$BASE_URL/notifications" \
    -H "Content-Type: application/json" \
    -d '{"userId":"'$USER_ID'","userType":"customer","message":"Performance test message #'$i' 🚀","type":"system"}' > /dev/null &
done

wait
echo "✅ Performance test completed - sent 10 concurrent notifications"
