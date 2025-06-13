# Order Microservice API Documentation

## Base URL
`http://localhost:3003/api/orders`

## Authentication
All endpoints require a Bearer token in the Authorization header:
`Authorization: Bearer <jwt_token>`

## Endpoints

### 1. Create Order
POST /
Content-Type: application/json

Request Body:
{
  "restaurant_id": "123e4567-e89b-12d3-a456-426614174000",
  "items": [
    {
      "menu_item_id": "123e4567-e89b-12d3-a456-426614174001",
      "quantity": 2,
      "customizations": {
        "spice_level": "medium",
        "extra_cheese": true
      },
      "notes": "No onions please"
    }
  ],
  "delivery_address": "123 Main St, City, State 12345",
  "delivery_instructions": "Ring doorbell twice",
  "special_instructions": "Contact before delivery",
  "discount_amount": 5.00
}

Response:
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "customer_id": "123e4567-e89b-12d3-a456-426614174003",
    "restaurant_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "pending",
    "total_amount": "25.99",
    "items": [...],
    "created_at": "2024-01-01T12:00:00Z"
  }
}

### 2. Get Order
GET /:id

Response:
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "customer_id": "123e4567-e89b-12d3-a456-426614174003",
    "restaurant_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "confirmed",
    "total_amount": "25.99",
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174004",
        "menu_item_id": "123e4567-e89b-12d3-a456-426614174001",
        "quantity": 2,
        "unit_price": "10.99",
        "total_price": "21.98",
        "customizations": {
          "spice_level": "medium",
          "extra_cheese": true
        }
      }
    ],
    "created_at": "2024-01-01T12:00:00Z"
  }
}

### 3. Update Order Status
PATCH /:id/status
Content-Type: application/json

Request Body:
{
  "status": "confirmed",
  "driver_id": "123e4567-e89b-12d3-a456-426614174005"
}

Response:
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "status": "confirmed",
    "driver_id": "123e4567-e89b-12d3-a456-426614174005"
  }
}

### 4. Cancel Order
PATCH /:id/cancel
Content-Type: application/json

Request Body:
{
  "reason": "Customer requested cancellation"
}

Response:
{
  "success": true,
  "message": "Order cancelled successfully"
}

### 5. Get Order History
GET /history?page=1&limit=20

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}

### 6. Get Order Statistics
GET /stats?restaurant_id=123&start_date=2024-01-01&end_date=2024-01-31

Response:
{
  "success": true,
  "data": {
    "total_orders": 150,
    "total_revenue": "3250.50",
    "average_order_value": "21.67",
    "completed_orders": 140,
    "cancelled_orders": 10
  }
}