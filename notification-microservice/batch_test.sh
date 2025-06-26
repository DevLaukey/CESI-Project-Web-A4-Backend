#!/bin/bash

# Quick batch test for common scenarios
BASE_URL="http://localhost:3007/api"
USER_ID="batch-test-user"
PHONE="+33769932091"  # Replace with your phone
echo "🚀 Running Batch Test Scenario..."

# Setup user
curl -s -X POST "$BASE_URL/preferences" \
  -H "Content-Type: application/json" \
  -d '{"userId":"'$USER_ID'","phone":"'$PHONE'","smsEnabled":true,"orderNotifications":true,"deliveryNotifications":true,"paymentNotifications":true}' > /dev/null

echo "📱 Simulating complete order flow..."

# 1. Order confirmed
curl -s -X POST "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{"userId":"'$USER_ID'","template":"order.confirmed","data":["ORD-BATCH-001","Test Restaurant"]}' > /dev/null

sleep 2

# 2. Order preparing
curl -s -X POST "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{"userId":"'$USER_ID'","template":"order.preparing","data":["ORD-BATCH-001","20"]}' > /dev/null

sleep 2

# 3. Driver assigned
curl -s -X POST "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{"userId":"'$USER_ID'","template":"delivery.assigned","data":["ORD-BATCH-001","Test Driver","10"]}' > /dev/null

sleep 2

# 4. Order delivered
curl -s -X POST "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{"userId":"'$USER_ID'","template":"delivery.delivered","data":["ORD-BATCH-001"]}' > /dev/null

sleep 2

# 5. Payment confirmed
curl -s -X POST "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{"userId":"'$USER_ID'","template":"payment.success","data":["ORD-BATCH-001","29.99"]}' > /dev/null

echo "✅ Batch test completed! Check your phone for 5 SMS messages"

# Get final notification count
RESULT=$(curl -s -X GET "$BASE_URL/notifications/$USER_ID")
COUNT=$(echo $RESULT | grep -o '"_id"' | wc -l)
echo "📊 Total notifications sent: $COUNT"
