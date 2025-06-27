# Driver Service - Food Delivery Backend

A comprehensive Node.js microservice for managing driver operations in a food delivery application.

## Features

✅ **Driver Authentication & Authorization**

- JWT-based authentication
- Secure password hashing with bcrypt
- Driver registration and login

✅ **Order Management**

- Get available deliveries (confirmed orders only)
- Accept/reject deliveries with race condition prevention
- Mark orders as picked up and completed
- Real-time order status updates

✅ **Driver Statistics & Analytics**

- Complete dashboard with earnings, delivery counts
- Performance metrics (completion rate, average delivery time)
- Earnings breakdown by day/week/month
- Real-time statistics

✅ **Security & Performance**

- Rate limiting and CORS protection
- Input validation with Joi
- MongoDB transactions for data consistency
- Optimistic concurrency control
- Comprehensive error handling

## Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**
Create a `.env` file with:

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/food_delivery
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

3. **Start MongoDB:**
Make sure MongoDB is running locally or use MongoDB Atlas.

4. **Run the service:**

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

- `POST /api/drivers/register` - Register new driver
- `POST /api/drivers/login` - Driver login
- `GET /api/drivers/profile` - Get driver profile
- `POST /api/drivers/status` - Update online status

### Orders

- `GET /api/orders/available` - Get available deliveries
- `POST /api/orders/:orderId/accept` - Accept a delivery
- `POST /api/orders/:orderId/reject` - Reject a delivery
- `POST /api/orders/:orderId/pickup` - Mark as picked up
- `POST /api/orders/:orderId/complete` - Complete delivery
- `GET /api/orders/my-deliveries` - Get driver's deliveries

### Statistics

- `GET /api/stats/dashboard` - Driver dashboard stats
- `GET /api/stats/earnings` - Earnings breakdown

## Usage Examples

### Register a Driver

```javascript
POST /api/drivers/register
{
  "email": "driver@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "licenseNumber": "DL123456",
  "vehicleInfo": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "licensePlate": "ABC123",
    "color": "White"
  }
}
```

### Accept a Delivery

```javascript
POST /api/orders/ORD123/accept
Headers: Authorization: Bearer <jwt_token>
```

### Get Available Orders

```javascript
GET /api/orders/available?page=1&limit=10
Headers: Authorization: Bearer <jwt_token>
```

## Architecture

```
├── server.js              # Main application entry point
├── models/
│   ├── Driver.js          # Driver data model
│   └── Order.js           # Order data model
├── routes/
│   ├── driverRoutes.js    # Driver authentication routes
│   ├── orderRoutes.js     # Order management routes
│   └── statsRoutes.js     # Statistics routes
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   └── errorHandler.js    # Global error handling
├── validators/
│   ├── driverValidator.js # Driver input validation
│   └── orderValidator.js  # Order input validation
└── utils/
    ├── constants.js       # Application constants
    └── helpers.js         # Utility functions
```

## Key Features Implemented

### Race Condition Prevention

Uses MongoDB transactions and optimistic concurrency control to prevent multiple drivers from accepting the same order.

### Comprehensive Error Handling

Structured error responses with proper HTTP status codes and detailed error messages.

### Security Best Practices

- JWT authentication
- Password hashing
- Input validation
- Rate limiting
- CORS protection

### Performance Optimizations

- Database indexing
- Pagination for large datasets
- Efficient aggregation pipelines

## Testing

```bash
npm test
```

## Deployment

This microservice is designed to be easily deployable to:

- Docker containers
- AWS Lambda
- Heroku
- DigitalOcean App Platform
- Any Node.js hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
*/
