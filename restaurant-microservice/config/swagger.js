const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Restaurant Management Service API",
      version: "1.0.0",
      description:
        "Comprehensive restaurant management service for handling restaurants, menus, items, reviews, and statistics",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
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
        Restaurant: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              format: "uuid",
              description: "Unique identifier for the restaurant",
            },
            name: {
              type: "string",
              description: "Restaurant name",
            },
            description: {
              type: "string",
              description: "Restaurant description",
            },
            isActive: {
              type: "boolean",
              description: "Whether the restaurant is active",
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
        Menu: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              format: "uuid",
              description: "Unique identifier for the menu",
            },
            name: {
              type: "string",
              description: "Menu name",
            },
            description: {
              type: "string",
              description: "Menu description",
            },
            isAvailable: {
              type: "boolean",
              description: "Whether the menu is available",
            },
            restaurantId: {
              type: "integer",
              description: "ID of the restaurant this menu belongs to",
            },
          },
        },
        Item: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              format: "uuid",
              description: "Unique identifier for the item",
            },
            name: {
              type: "string",
              description: "Item name",
            },
            description: {
              type: "string",
              description: "Item description",
            },
            price: {
              type: "number",
              format: "decimal",
              description: "Item price",
            },
            isAvailable: {
              type: "boolean",
              description: "Whether the item is available",
            },
          },
        },
        Category: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              format: "uuid",
              description: "Unique identifier for the category",
            },
            name: {
              type: "string",
              description: "Category name",
            },
            sortOrder: {
              type: "integer",
              description: "Sort order for display",
            },
            isActive: {
              type: "boolean",
              description: "Whether the category is active",
            },
          },
        },
        Review: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              format: "uuid",
              description: "Unique identifier for the review",
            },
            rating: {
              type: "integer",
              minimum: 1,
              maximum: 5,
              description: "Rating from 1 to 5",
            },
            comment: {
              type: "string",
              description: "Review comment",
            },
            isVisible: {
              type: "boolean",
              description: "Whether the review is visible",
            },
            restaurantId: {
              type: "integer",
              description: "ID of the restaurant being reviewed",
            },
          },
        },
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
                currentPage: {
                  type: "integer",
                },
                totalPages: {
                  type: "integer",
                },
                totalCount: {
                  type: "integer",
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Restaurants",
        description: "Restaurant management operations",
      },
      {
        name: "Menus",
        description: "Menu management operations",
      },
      {
        name: "Items",
        description: "Menu item management operations",
      },
      {
        name: "Categories",
        description: "Category management operations",
      },
      {
        name: "Reviews",
        description: "Review management operations",
      },
      {
        name: "Statistics",
        description: "Statistics and analytics operations",
      },
      {
        name: "Service",
        description: "Service information and health checks",
      },
    ],
    paths: {
      "/api/info": {
        get: {
          tags: ["Service"],
          summary: "Get service information",
          description:
            "Returns basic information about the Restaurant Management Service",
          responses: {
            200: {
              description: "Service information retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      service: { type: "string" },
                      version: { type: "string" },
                      endpoints: { type: "object" },
                      timestamp: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/restaurants/search": {
        get: {
          tags: ["Restaurants"],
          summary: "Search restaurants",
          description: "Search for restaurants based on query parameters",
          parameters: [
            {
              name: "q",
              in: "query",
              description: "Search query",
              required: false,
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              description: "Page number",
              required: false,
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              description: "Number of results per page",
              required: false,
              schema: { type: "integer", default: 10 },
            },
          ],
          responses: {
            200: {
              description: "Restaurants found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PaginationResponse" },
                },
              },
            },
          },
        },
      },
      "/api/restaurants/popular": {
        get: {
          tags: ["Restaurants"],
          summary: "Get popular restaurants",
          description: "Retrieve a list of popular restaurants",
          responses: {
            200: {
              description: "Popular restaurants retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
          },
        },
      },
      "/api/restaurants/{uuid}": {
        get: {
          tags: ["Restaurants"],
          summary: "Get restaurant by UUID",
          description: "Retrieve a specific restaurant by its UUID",
          parameters: [
            {
              name: "uuid",
              in: "path",
              required: true,
              description: "Restaurant UUID",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Restaurant found",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Restaurant" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: {
              description: "Restaurant not found",
            },
          },
        },
      },
      "/api/categories": {
        get: {
          tags: ["Categories"],
          summary: "Get all categories",
          description: "Retrieve all active categories",
          responses: {
            200: {
              description: "Categories retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      categories: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Category" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/reviews/restaurant/{restaurantUuid}": {
        get: {
          tags: ["Reviews"],
          summary: "Get restaurant reviews",
          description: "Retrieve reviews for a specific restaurant",
          parameters: [
            {
              name: "restaurantUuid",
              in: "path",
              required: true,
              description: "Restaurant UUID",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "page",
              in: "query",
              description: "Page number",
              required: false,
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              description: "Number of reviews per page",
              required: false,
              schema: { type: "integer", default: 10 },
            },
            {
              name: "rating",
              in: "query",
              description: "Filter by rating",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 5 },
            },
          ],
          responses: {
            200: {
              description: "Reviews retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PaginationResponse" },
                },
              },
            },
            404: {
              description: "Restaurant not found",
            },
          },
        },
      },
    },
  },
  apis: ["./routes/*.js", "./routes/index.js"],
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Restaurant Management API Documentation",
    })
  );

  // Also provide JSON endpoint for the spec
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });
};
