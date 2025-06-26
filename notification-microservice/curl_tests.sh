#!/bin/bash

# =============================================================================
# NOTIFICATION SERVICE - COMPLETE CURL TESTS
# =============================================================================

BASE_URL="http://localhost:3007/api"
PHONE_NUMBER="+1234567890"  # Replace with your phone number for testing
USER_ID="test-user-123"

echo "🧪 Testing Notification Service API Endpoints"
echo "=============================================="
echo ""

# =============================================================================
# 1. HEALTH CHECK
# =============================================================================
echo "1. 🏥 Health Check"
echo "-------------------"
curl -X GET \
  "http://localhost:3007/health" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 2. USER PREFERENCES - CREATE/UPDATE
# =============================================================================
echo "2. 👤 Create/Update User Preferences"
echo "------------------------------------"
curl -X POST \
  "$BASE_URL/preferences" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "phone": "'$PHONE_NUMBER'",
    "smsEnabled": true,
    "orderNotifications": true,
    "deliveryNotifications": true,
    "paymentNotifications": true,
    "systemNotifications": true
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 3. GET USER PREFERENCES
# =============================================================================
echo "3. 📋 Get User Preferences"
echo "--------------------------"
curl -X GET \
  "$BASE_URL/preferences/$USER_ID" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 4. SEND SIMPLE NOTIFICATION
# =============================================================================
echo "4. 📱 Send Simple Notification"
echo "------------------------------"
curl -X POST \
  "$BASE_URL/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "userType": "customer",
    "message": "🍕 Hello! This is a test notification from your food delivery app!",
    "type": "system",
    "data": {
      "testMessage": true,
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 5. TEMPLATED NOTIFICATIONS - ORDER TEMPLATES
# =============================================================================
echo "5. 🍽️ Order Template Notifications"
echo "----------------------------------"

# Order Confirmed
echo "5a. Order Confirmed Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "order.confirmed",
    "data": ["ORD-12345", "Pizza Palace"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Order Preparing
echo "5b. Order Preparing Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "order.preparing",
    "data": ["ORD-12345", "15"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Order Ready
echo "5c. Order Ready Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "order.ready",
    "data": ["ORD-12345", "Pizza Palace"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 6. TEMPLATED NOTIFICATIONS - DELIVERY TEMPLATES
# =============================================================================
echo "6. 🚗 Delivery Template Notifications"
echo "------------------------------------"

# Driver Assigned
echo "6a. Driver Assigned Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "delivery.assigned",
    "data": ["ORD-12345", "John Smith", "15"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Order Picked Up
echo "6b. Order Picked Up Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "delivery.pickup",
    "data": ["ORD-12345", "John Smith"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Order Delivered
echo "6c. Order Delivered Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "delivery.delivered",
    "data": ["ORD-12345"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Delivery Delayed
echo "6d. Delivery Delayed Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "delivery.delayed",
    "data": ["ORD-12345", "25", "Heavy traffic"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 7. TEMPLATED NOTIFICATIONS - PAYMENT TEMPLATES
# =============================================================================
echo "7. 💳 Payment Template Notifications"
echo "-----------------------------------"

# Payment Success
echo "7a. Payment Success Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "payment.success",
    "data": ["ORD-12345", "24.99"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Payment Failed
echo "7b. Payment Failed Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "payment.failed",
    "data": ["ORD-12345", "Card declined"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Refund Processed
echo "7c. Refund Processed Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "payment.refund",
    "data": ["ORD-12345", "24.99"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 8. TEMPLATED NOTIFICATIONS - SYSTEM TEMPLATES
# =============================================================================
echo "8. 🔧 System Template Notifications"
echo "----------------------------------"

# Welcome Message
echo "8a. Welcome Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "system.welcome",
    "data": ["John Doe"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Maintenance Notice
echo "8b. Maintenance Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "system.maintenance",
    "data": ["2:00 AM", "1 hour"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 9. GET USER NOTIFICATIONS
# =============================================================================
echo "9. 📜 Get User Notifications"
echo "----------------------------"
curl -X GET \
  "$BASE_URL/notifications/$USER_ID" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 10. BULK NOTIFICATIONS
# =============================================================================
echo "10. 📢 Send Bulk Notifications"
echo "------------------------------"
curl -X POST \
  "$BASE_URL/notifications/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["'$USER_ID'", "test-user-456", "test-user-789"],
    "message": "🎉 Special Offer! Get 20% off your next order with code SAVE20. Valid until midnight!",
    "type": "system"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 11. TEST DIRECT SMS (Simple Test)
# =============================================================================
echo "11. 🧪 Direct SMS Test"
echo "---------------------"
curl -X POST \
  "$BASE_URL/test" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "'$PHONE_NUMBER'",
    "message": "Direct test message from cURL! 🚀"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 12. UPDATE USER PREFERENCES (Disable some notifications)
# =============================================================================
echo "12. ⚙️ Update User Preferences (Disable Some)"
echo "--------------------------------------------"
curl -X POST \
  "$BASE_URL/preferences" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "phone": "'$PHONE_NUMBER'",
    "smsEnabled": true,
    "orderNotifications": true,
    "deliveryNotifications": true,
    "paymentNotifications": false,
    "systemNotifications": false
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 13. TRY SENDING DISABLED NOTIFICATION TYPE
# =============================================================================
echo "13. 🚫 Try Sending Disabled Notification Type"
echo "---------------------------------------------"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "payment.success",
    "data": ["ORD-99999", "19.99"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 14. ERROR TESTS
# =============================================================================
echo "14. ❌ Error Tests"
echo "-----------------"

# Missing required fields
echo "14a. Missing Required Fields:"
curl -X POST \
  "$BASE_URL/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "message": "Test without userType"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Invalid template
echo "14b. Invalid Template:"
curl -X POST \
  "$BASE_URL/notifications/templated" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "template": "invalid.template",
    "data": ["test"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Non-existent user notifications
echo "14c. Non-existent User:"
curl -X GET \
  "$BASE_URL/notifications/non-existent-user" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# 15. WEBHOOK SIMULATION (Twilio Status Update)
# =============================================================================
echo "15. 🔗 Webhook Simulation"
echo "-------------------------"
curl -X POST \
  "$BASE_URL/webhooks/twilio" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM1234567890&MessageStatus=delivered&ErrorCode=" \
  -w "\nStatus: %{http_code}\n\n"

# =============================================================================
# COMPLETE!
# =============================================================================
echo "✅ All API tests completed!"
echo "📱 Check your phone ($PHONE_NUMBER) for SMS messages"
echo ""
echo "🔍 To check a specific notification status with Twilio SID:"
echo "curl -X GET '$BASE_URL/notifications/status/YOUR_TWILIO_SID'"
echo ""

# =============================================================================
# BATCH TESTING SCRIPT
# =============================================================================

# Create a separate file for batch testing
cat > batch_test.sh << 'EOF'
#!/bin/bash

# Quick batch test for common scenarios
BASE_URL="http://localhost:3007/api"
USER_ID="batch-test-user"
PHONE="+1234567890"  # Replace with your phone

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
EOF

chmod +x batch_test.sh

echo "📝 Created batch_test.sh for quick testing"
echo "Run: ./batch_test.sh"

# =============================================================================
# PERFORMANCE TEST SCRIPT  
# =============================================================================

cat > performance_test.sh << 'EOF'
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
EOF

chmod +x performance_test.sh

echo "📝 Created performance_test.sh for load testing"
echo "Run: ./performance_test.sh"

echo ""
echo "🎯 Test Files Created:"
echo "  - This script: Complete API testing"
echo "  - batch_test.sh: Simulates full order flow"
echo "  - performance_test.sh: Tests concurrent notifications"