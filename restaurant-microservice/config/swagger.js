const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Delivery Management Service API",
      version: "1.0.0",
      description:
        "Comprehensive delivery management service API for handling deliveries, drivers, tracking, and administrative operations",
      contact: {
        name: "API Support",
        email: "support@deliveryservice.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: "Development server",
      },
      {
        url: `https://api.deliveryservice.com`,
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for user authentication",
        },
        serviceAuth: {
          type: "apiKey",
          in: "header",
          name: "X-Service-Key",
          description: "Service-to-service authentication key",
        },
      },
      schemas: {
        // Core Delivery Schema
        Delivery: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Unique delivery identifier",
              example: "delivery_123456",
            },
            orderId: {
              type: "string",
              description: "Associated order ID",
              example: "order_789012",
            },
            customerId: {
              type: "string",
              description: "Customer identifier",
              example: "customer_345678",
            },
            restaurantId: {
              type: "string",
              description: "Restaurant identifier",
              example: "restaurant_901234",
            },
            driverId: {
              type: "string",
              description: "Assigned driver identifier",
              example: "driver_567890",
            },
            trackingNumber: {
              type: "string",
              description: "Public tracking number",
              example: "TRK123456789",
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "assigned",
                "picked_up",
                "in_transit",
                "delivered",
                "cancelled",
              ],
              description: "Current delivery status",
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high", "urgent"],
              default: "normal",
              description: "Delivery priority level",
            },
            pickupAddress: {
              $ref: "#/components/schemas/Address",
            },
            deliveryAddress: {
              $ref: "#/components/schemas/Address",
            },
            estimatedValue: {
              type: "number",
              description: "Estimated order value for insurance",
              example: 25.99,
            },
            estimatedDeliveryTime: {
              type: "string",
              format: "date-time",
              description: "Estimated delivery completion time",
            },
            actualDeliveryTime: {
              type: "string",
              format: "date-time",
              description: "Actual delivery completion time",
            },
            specialInstructions: {
              type: "string",
              description: "Special handling instructions",
              example: "Handle with care - fragile items",
            },
            proof: {
              $ref: "#/components/schemas/DeliveryProof",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },

        // Address Schema
        Address: {
          type: "object",
          required: ["street", "city", "latitude", "longitude"],
          properties: {
            street: {
              type: "string",
              description: "Street address",
              example: "123 Main Street",
            },
            city: {
              type: "string",
              description: "City name",
              example: "New York",
            },
            state: {
              type: "string",
              description: "State or province",
              example: "NY",
            },
            zipCode: {
              type: "string",
              description: "Postal code",
              example: "10001",
            },
            country: {
              type: "string",
              description: "Country code",
              example: "US",
              default: "US",
            },
            latitude: {
              type: "number",
              description: "Latitude coordinate",
              example: 40.7128,
            },
            longitude: {
              type: "number",
              description: "Longitude coordinate",
              example: -74.006,
            },
            instructions: {
              type: "string",
              description: "Delivery instructions",
              example: "Ring doorbell, leave at door",
            },
          },
        },

        // Driver Profile Schema
        DriverProfile: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Driver identifier",
            },
            userId: {
              type: "string",
              description: "Associated user account ID",
            },
            firstName: {
              type: "string",
              description: "Driver's first name",
            },
            lastName: {
              type: "string",
              description: "Driver's last name",
            },
            email: {
              type: "string",
              format: "email",
              description: "Driver's email address",
            },
            phone: {
              type: "string",
              description: "Driver's phone number",
            },
            licenseNumber: {
              type: "string",
              description: "Driver's license number",
            },
            vehicle: {
              $ref: "#/components/schemas/VehicleInfo",
            },
            isVerified: {
              type: "boolean",
              description: "Whether the driver is verified",
            },
            isAvailable: {
              type: "boolean",
              description: "Whether the driver is currently available",
            },
            status: {
              type: "string",
              enum: [
                "pending_verification",
                "verified",
                "suspended",
                "rejected",
              ],
              description: "Driver status",
            },
            location: {
              $ref: "#/components/schemas/Location",
            },
            rating: {
              type: "number",
              minimum: 0,
              maximum: 5,
              description: "Average driver rating",
            },
            totalDeliveries: {
              type: "integer",
              description: "Total number of completed deliveries",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },

        // Vehicle Information Schema
        VehicleInfo: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["car", "motorcycle", "bicycle", "truck"],
              description: "Vehicle type",
            },
            make: {
              type: "string",
              description: "Vehicle manufacturer",
              example: "Toyota",
            },
            model: {
              type: "string",
              description: "Vehicle model",
              example: "Camry",
            },
            year: {
              type: "integer",
              description: "Vehicle year",
              example: 2020,
            },
            licensePlate: {
              type: "string",
              description: "License plate number",
              example: "ABC123",
            },
            color: {
              type: "string",
              description: "Vehicle color",
              example: "Blue",
            },
            documents: {
              type: "object",
              description: "Vehicle documents and their verification status",
            },
            lastInspection: {
              type: "string",
              format: "date",
              description: "Last inspection date",
            },
            insuranceExpiry: {
              type: "string",
              format: "date",
              description: "Insurance expiry date",
            },
          },
        },

        // Location Schema
        Location: {
          type: "object",
          required: ["latitude", "longitude"],
          properties: {
            latitude: {
              type: "number",
              description: "Latitude coordinate",
              example: 40.7128,
            },
            longitude: {
              type: "number",
              description: "Longitude coordinate",
              example: -74.006,
            },
            heading: {
              type: "number",
              minimum: 0,
              maximum: 360,
              description: "Direction in degrees",
            },
            speed: {
              type: "number",
              minimum: 0,
              description: "Speed in km/h",
            },
            accuracy: {
              type: "number",
              description: "GPS accuracy in meters",
            },
            lastUpdated: {
              type: "string",
              format: "date-time",
              description: "Last location update timestamp",
            },
          },
        },

        // Delivery Proof Schema
        DeliveryProof: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["photo", "signature", "qr_code", "pin"],
              description: "Type of proof provided",
            },
            data: {
              type: "string",
              description: "Base64 encoded proof data or PIN",
            },
            location: {
              $ref: "#/components/schemas/Location",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "When the proof was captured",
            },
          },
        },

        // Tracking Information Schema
        TrackingInfo: {
          type: "object",
          properties: {
            trackingNumber: {
              type: "string",
              description: "Unique tracking number",
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "assigned",
                "picked_up",
                "in_transit",
                "delivered",
                "cancelled",
              ],
            },
            currentLocation: {
              $ref: "#/components/schemas/Location",
            },
            estimatedDeliveryTime: {
              type: "string",
              format: "date-time",
            },
            timeline: {
              type: "array",
              items: {
                $ref: "#/components/schemas/DeliveryMilestone",
              },
            },
            driver: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                },
                phone: {
                  type: "string",
                },
                vehicle: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                    },
                    licensePlate: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },

        // Delivery Milestone Schema
        DeliveryMilestone: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Milestone status",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
            location: {
              $ref: "#/components/schemas/Location",
            },
            notes: {
              type: "string",
              description: "Additional notes about the milestone",
            },
            updatedBy: {
              type: "string",
              description: "Who updated this milestone",
            },
          },
        },

        // Statistics Schemas
        DriverStats: {
          type: "object",
          properties: {
            totalDeliveries: {
              type: "integer",
              description: "Total number of deliveries",
            },
            completedDeliveries: {
              type: "integer",
              description: "Number of completed deliveries",
            },
            totalEarnings: {
              type: "number",
              description: "Total earnings",
            },
            averageRating: {
              type: "number",
              minimum: 0,
              maximum: 5,
              description: "Average customer rating",
            },
            totalHours: {
              type: "number",
              description: "Total hours worked",
            },
            completionRate: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Delivery completion rate as percentage",
            },
            onTimeDeliveryRate: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "On-time delivery rate as percentage",
            },
          },
        },

        SystemOverview: {
          type: "object",
          properties: {
            totalDeliveries: {
              type: "integer",
              description: "Total number of deliveries in the system",
            },
            activeDeliveries: {
              type: "integer",
              description: "Number of currently active deliveries",
            },
            totalDrivers: {
              type: "integer",
              description: "Total number of registered drivers",
            },
            activeDrivers: {
              type: "integer",
              description: "Number of currently active drivers",
            },
            systemHealth: {
              type: "string",
              enum: ["healthy", "degraded", "critical"],
              description: "Overall system health status",
            },
            averageDeliveryTime: {
              type: "number",
              description: "Average delivery time in minutes",
            },
            performanceMetrics: {
              type: "object",
              properties: {
                successRate: {
                  type: "number",
                  description: "Overall delivery success rate",
                },
                customerSatisfaction: {
                  type: "number",
                  description: "Average customer satisfaction score",
                },
              },
            },
          },
        },

        // Common Response Schemas
        ApiResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Whether the request was successful",
            },
            message: {
              type: "string",
              description: "Response message",
            },
            data: {
              type: "object",
              description: "Response data",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Response timestamp",
            },
          },
        },

        PaginationResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            data: {
              type: "array",
              items: {
                type: "object",
              },
            },
            pagination: {
              type: "object",
              properties: {
                page: {
                  type: "integer",
                  description: "Current page number",
                },
                limit: {
                  type: "integer",
                  description: "Number of items per page",
                },
                total: {
                  type: "integer",
                  description: "Total number of items",
                },
                pages: {
                  type: "integer",
                  description: "Total number of pages",
                },
              },
            },
          },
        },

        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "string",
              description: "Error message",
            },
            code: {
              type: "string",
              description: "Error code",
            },
            details: {
              type: "object",
              description: "Additional error details",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
          },
        },

        ValidationError: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "string",
              example: "Validation failed",
            },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: {
                    type: "string",
                    description: "Field that failed validation",
                  },
                  message: {
                    type: "string",
                    description: "Validation error message",
                  },
                },
              },
            },
          },
        },
      },

      responses: {
        UnauthorizedError: {
          description: "Unauthorized - Invalid or missing authentication",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        ForbiddenError: {
          description: "Forbidden - Insufficient permissions",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationError",
              },
            },
          },
        },
        InternalServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
      },

      parameters: {
        DeliveryId: {
          name: "id",
          in: "path",
          required: true,
          description: "Delivery identifier",
          schema: {
            type: "string",
          },
        },
        DriverId: {
          name: "id",
          in: "path",
          required: true,
          description: "Driver identifier",
          schema: {
            type: "string",
          },
        },
        TrackingNumber: {
          name: "trackingNumber",
          in: "path",
          required: true,
          description: "Delivery tracking number",
          schema: {
            type: "string",
          },
        },
        PageParam: {
          name: "page",
          in: "query",
          description: "Page number for pagination",
          schema: {
            type: "integer",
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: "limit",
          in: "query",
          description: "Number of items per page",
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 10,
          },
        },
      },
    },

    tags: [
      {
        name: "Admin - System",
        description: "System overview and health monitoring",
      },
      {
        name: "Admin - Deliveries",
        description: "Administrative delivery management",
      },
      {
        name: "Admin - Drivers",
        description: "Driver management and approval",
      },
      {
        name: "Admin - Analytics",
        description: "Analytics and reporting",
      },
      {
        name: "Admin - Configuration",
        description: "System configuration management",
      },
      {
        name: "Delivery - Service",
        description: "Service-to-service delivery operations (internal API)",
      },
      {
        name: "Delivery - Public",
        description: "Public delivery tracking and information",
      },
      {
        name: "Delivery - User",
        description: "User delivery operations (customer/restaurant access)",
      },
      {
        name: "Delivery - Driver",
        description: "Driver-specific delivery operations",
      },
      {
        name: "Delivery - QR Code",
        description: "QR code validation and generation",
      },
      {
        name: "Delivery - Feedback",
        description: "Rating and feedback system",
      },
      {
        name: "Delivery - Analytics",
        description: "Statistics and performance metrics",
      },
      {
        name: "Delivery - Emergency",
        description: "Emergency and support operations",
      },
      {
        name: "Driver - Registration",
        description: "Driver registration and profile management",
      },
      {
        name: "Driver - Location",
        description: "Driver location and availability management",
      },
      {
        name: "Driver - Deliveries",
        description: "Driver delivery operations",
      },
      {
        name: "Driver - Analytics",
        description: "Driver performance and earnings",
      },
      {
        name: "Driver - Admin",
        description: "Administrative driver operations",
      },
      {
        name: "Tracking",
        description: "Delivery tracking and real-time updates",
      },
      {
        name: "Health",
        description: "System health and status endpoints",
      },
    ],
  },
  apis: [
    "./routes/*.js",
    "./routes/adminRoutes.js",
    "./routes/deliveryRoutes.js",
    "./routes/driverRoutes.js",
    "./routes/trackingRoutes.js",
    "./routes/index.js",
  ],
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 50px 0; }
        .swagger-ui .info .title { color: #3b4151; }
        .swagger-ui .scheme-container { background: #fafafa; padding: 20px; margin: 20px 0; }
      `,
      customSiteTitle: "Delivery Management API Documentation",
      customfavIcon: "/favicon.ico",
      customJs: [
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js",
      ],
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: "none",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
      },
    })
  );

  // Provide JSON endpoint for the spec
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  // Provide YAML endpoint for the spec
  app.get("/api-docs.yaml", (req, res) => {
    res.setHeader("Content-Type", "application/x-yaml");
    const yaml = require("js-yaml");
    res.send(yaml.dump(specs));
  });

  // Health check for documentation
  app.get("/api-docs/health", (req, res) => {
    res.json({
      status: "healthy",
      documentation: "available",
      endpoints: Object.keys(specs.paths || {}).length,
      schemas: Object.keys(specs.components?.schemas || {}).length,
      timestamp: new Date().toISOString(),
    });
  });
};
