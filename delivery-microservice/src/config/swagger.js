const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Delivery Microservice API",
      version: "1.0.0",
      description:
        "Microservice for managing deliveries, drivers, tracking, and administrative functions",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Delivery: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Unique delivery identifier",
            },
            pickupAddress: {
              type: "string",
              description: "Pickup location address",
            },
            deliveryAddress: {
              type: "string",
              description: "Delivery destination address",
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
            driverId: {
              type: "string",
              description: "Assigned driver ID",
            },
            customerId: {
              type: "string",
              description: "Customer ID who requested the delivery",
            },
          
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
        },
        Driver: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Unique driver identifier",
            },
            name: {
              type: "string",
              description: "Driver's full name",
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
            vehicle: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  description: "Vehicle type (car, bike, truck, etc.)",
                },
                licensePlate: {
                  type: "string",
                  description: "Vehicle license plate number",
                },
              },
            },
            status: {
              type: "string",
              enum: ["available", "busy", "offline"],
              description: "Driver's current availability status",
            },
            location: {
              type: "object",
              properties: {
                latitude: {
                  type: "number",
                  description: "Current latitude",
                },
                longitude: {
                  type: "number",
                  description: "Current longitude",
                },
              },
            },
          },
        },
        TrackingUpdate: {
          type: "object",
          properties: {
            deliveryId: {
              type: "string",
              description: "Associated delivery ID",
            },
            location: {
              type: "object",
              properties: {
                latitude: {
                  type: "number",
                },
                longitude: {
                  type: "number",
                },
              },
            },
            status: {
              type: "string",
              description: "Current status update",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
            notes: {
              type: "string",
              description: "Additional notes or comments",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
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
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Updated path to match your folder structure
  apis: [
    "./src/routes/*.js",
    "./src/routes/adminRoutes.js",
    "./src/routes/deliveryRoutes.js",
    "./src/routes/trackingRoutes.js",
    "./src/routes/driverRoutes.js",
  ],
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Delivery Microservice API Documentation",
    })
  );

  // Serve the swagger spec as JSON
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });
};
