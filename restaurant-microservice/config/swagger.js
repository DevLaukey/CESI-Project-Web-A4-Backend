const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Restaurant Management Service API",
      version: "1.0.0",
      description:
        "Comprehensive restaurant management service API for handling restaurants, menus, items, categories, reviews, and statistics",
      contact: {
        name: "API Support",
        email: "support@restaurantservice.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api`,
        description: "Development server",
      },
      {
        url: `https://api.restaurantservice.com/api`,
        description: "Production server",
      },
    ],
    paths: {
      // Service Info Routes
      "/info": {
        get: {
          tags: ["Service Info"],
          summary: "Get service information",
          description:
            "Returns service information, version, and available endpoints",
          responses: {
            200: {
              description: "Service information retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      service: {
                        type: "string",
                        example: "Restaurant Management Service",
                      },
                      version: { type: "string", example: "1.0.0" },
                      endpoints: {
                        type: "object",
                        properties: {
                          restaurants: {
                            type: "string",
                            example: "/api/restaurants",
                          },
                          items: { type: "string", example: "/api/items" },
                          menus: { type: "string", example: "/api/menus" },
                          categories: {
                            type: "string",
                            example: "/api/categories",
                          },
                          stats: { type: "string", example: "/api/stats" },
                          reviews: { type: "string", example: "/api/reviews" },
                        },
                      },
                      timestamp: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // Restaurant Routes
      "/restaurants/search": {
        get: {
          tags: ["Restaurants - Public"],
          summary: "Search restaurants",
          description: "Search for restaurants with various filters",
          parameters: [
            { $ref: "#/components/parameters/SearchQuery" },
            { $ref: "#/components/parameters/PageParam" },
            { $ref: "#/components/parameters/LimitParam" },
            {
              name: "cuisine",
              in: "query",
              description: "Filter by cuisine type",
              schema: { type: "string", example: "Italian" },
            },
            {
              name: "rating",
              in: "query",
              description: "Minimum rating filter",
              schema: { type: "number", minimum: 0, maximum: 5 },
            },
            {
              name: "latitude",
              in: "query",
              description: "Latitude for location-based search",
              schema: { type: "number" },
            },
            {
              name: "longitude",
              in: "query",
              description: "Longitude for location-based search",
              schema: { type: "number" },
            },
            {
              name: "radius",
              in: "query",
              description: "Search radius in km",
              schema: { type: "number", default: 10 },
            },
          ],
          responses: {
            200: {
              description: "Restaurants found successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          restaurants: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Restaurant" },
                          },
                          pagination: {
                            $ref: "#/components/schemas/PaginationInfo",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/restaurants/popular": {
        get: {
          tags: ["Restaurants - Public"],
          summary: "Get popular restaurants",
          description: "Retrieve a list of popular restaurants",
          parameters: [{ $ref: "#/components/parameters/LimitParam" }],
          responses: {
            200: {
              description: "Popular restaurants retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          restaurants: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Restaurant" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/restaurants/nearby": {
        get: {
          tags: ["Restaurants - Public"],
          summary: "Get nearby restaurants",
          description: "Find restaurants near a specific location",
          parameters: [
            {
              name: "latitude",
              in: "query",
              required: true,
              description: "Latitude coordinate",
              schema: { type: "number" },
            },
            {
              name: "longitude",
              in: "query",
              required: true,
              description: "Longitude coordinate",
              schema: { type: "number" },
            },
            {
              name: "radius",
              in: "query",
              description: "Search radius in km",
              schema: { type: "number", default: 5 },
            },
            { $ref: "#/components/parameters/LimitParam" },
          ],
          responses: {
            200: {
              description: "Nearby restaurants found successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          restaurants: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Restaurant" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/restaurants/{uuid}": {
        get: {
          tags: ["Restaurants - Public"],
          summary: "Get restaurant details",
          description:
            "Retrieve detailed information about a specific restaurant",
          parameters: [{ $ref: "#/components/parameters/RestaurantUuid" }],
          responses: {
            200: {
              description: "Restaurant details retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          restaurant: {
                            $ref: "#/components/schemas/Restaurant",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/restaurants": {
        post: {
          tags: ["Restaurants - Owner"],
          summary: "Create a new restaurant",
          description: "Create a new restaurant (requires authentication)",
          security: [{ userHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "cuisine", "address", "phone"],
                  properties: {
                    name: { type: "string", example: "Mario's Italian Bistro" },
                    description: {
                      type: "string",
                      example: "Authentic Italian cuisine",
                    },
                    cuisine: { type: "string", example: "Italian" },
                    address: { $ref: "#/components/schemas/AddressInput" },
                    phone: { type: "string", example: "+1-555-123-4567" },
                    email: { type: "string", format: "email" },
                    website: { type: "string", format: "uri" },
                    priceRange: {
                      type: "string",
                      enum: ["$", "$$", "$$$", "$$$$"],
                    },
                    operatingHours: {
                      type: "object",
                      properties: {
                        monday: { type: "string", example: "9:00-22:00" },
                        tuesday: { type: "string", example: "9:00-22:00" },
                        wednesday: { type: "string", example: "9:00-22:00" },
                        thursday: { type: "string", example: "9:00-22:00" },
                        friday: { type: "string", example: "9:00-23:00" },
                        saturday: { type: "string", example: "10:00-23:00" },
                        sunday: { type: "string", example: "10:00-21:00" },
                      },
                    },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                      example: ["delivery", "takeout", "outdoor-seating"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Restaurant created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          restaurant: {
                            $ref: "#/components/schemas/Restaurant",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/restaurants/owner/me": {
        get: {
          tags: ["Restaurants - Owner"],
          summary: "Get my restaurant",
          description: "Get the authenticated user's restaurant details",
          security: [{ userHeader: [] }],
          responses: {
            200: {
              description: "Restaurant details retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          restaurant: {
                            $ref: "#/components/schemas/Restaurant",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
        put: {
          tags: ["Restaurants - Owner"],
          summary: "Update my restaurant",
          description: "Update the authenticated user's restaurant details",
          security: [{ userHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    cuisine: { type: "string" },
                    address: { $ref: "#/components/schemas/AddressInput" },
                    phone: { type: "string" },
                    email: { type: "string", format: "email" },
                    website: { type: "string", format: "uri" },
                    priceRange: {
                      type: "string",
                      enum: ["$", "$$", "$$$", "$$$$"],
                    },
                    operatingHours: { type: "object" },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Restaurant updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          restaurant: {
                            $ref: "#/components/schemas/Restaurant",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/restaurants/owner/status": {
        patch: {
          tags: ["Restaurants - Owner"],
          summary: "Toggle restaurant status",
          description: "Toggle the open/closed status of the restaurant",
          security: [{ userHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["isOpen"],
                  properties: {
                    isOpen: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Restaurant status updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/restaurants/owner/statistics": {
        get: {
          tags: ["Restaurants - Owner"],
          summary: "Get restaurant statistics",
          description: "Get statistics for the authenticated user's restaurant",
          security: [{ userHeader: [] }],
          parameters: [
            {
              name: "period",
              in: "query",
              description: "Statistics period",
              schema: {
                type: "string",
                enum: ["day", "week", "month", "year"],
                default: "month",
              },
            },
            {
              name: "startDate",
              in: "query",
              description: "Start date for statistics (YYYY-MM-DD)",
              schema: { type: "string", format: "date" },
            },
            {
              name: "endDate",
              in: "query",
              description: "End date for statistics (YYYY-MM-DD)",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            200: {
              description: "Statistics retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          statistics: {
                            $ref: "#/components/schemas/RestaurantStats",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // Menu Item Routes
      "/items/search": {
        get: {
          tags: ["Menu Items - Public"],
          summary: "Search menu items",
          description: "Search for menu items across all restaurants",
          parameters: [
            { $ref: "#/components/parameters/SearchQuery" },
            { $ref: "#/components/parameters/PageParam" },
            { $ref: "#/components/parameters/LimitParam" },
            {
              name: "category",
              in: "query",
              description: "Filter by category",
              schema: { type: "string" },
            },
            {
              name: "minPrice",
              in: "query",
              description: "Minimum price filter",
              schema: { type: "number", minimum: 0 },
            },
            {
              name: "maxPrice",
              in: "query",
              description: "Maximum price filter",
              schema: { type: "number", minimum: 0 },
            },
            {
              name: "allergens",
              in: "query",
              description:
                "Exclude items with these allergens (comma-separated)",
              schema: { type: "string", example: "gluten,dairy" },
            },
          ],
          responses: {
            200: {
              description: "Menu items found successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          items: {
                            type: "array",
                            items: { $ref: "#/components/schemas/MenuItem" },
                          },
                          pagination: {
                            $ref: "#/components/schemas/PaginationInfo",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/items/popular": {
        get: {
          tags: ["Menu Items - Public"],
          summary: "Get popular menu items",
          description: "Retrieve a list of popular menu items",
          parameters: [{ $ref: "#/components/parameters/LimitParam" }],
          responses: {
            200: {
              description: "Popular items retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          items: {
                            type: "array",
                            items: { $ref: "#/components/schemas/MenuItem" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/items/restaurant/{restaurantUuid}": {
        get: {
          tags: ["Menu Items - Public"],
          summary: "Get restaurant menu items",
          description: "Get all menu items for a specific restaurant",
          parameters: [
            { $ref: "#/components/parameters/RestaurantUuidParam" },
            {
              name: "category",
              in: "query",
              description: "Filter by category UUID",
              schema: { type: "string" },
            },
            {
              name: "available",
              in: "query",
              description: "Filter by availability",
              schema: { type: "boolean", default: true },
            },
          ],
          responses: {
            200: {
              description: "Restaurant items retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          items: {
                            type: "array",
                            items: { $ref: "#/components/schemas/MenuItem" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/items": {
        post: {
          tags: ["Menu Items - Owner"],
          summary: "Create a new menu item",
          description: "Create a new menu item (requires authentication)",
          security: [{ userHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "price", "categoryId"],
                  properties: {
                    name: { type: "string", example: "Margherita Pizza" },
                    description: {
                      type: "string",
                      example: "Classic pizza with tomato sauce and mozzarella",
                    },
                    price: { type: "number", example: 14.99, minimum: 0 },
                    originalPrice: {
                      type: "number",
                      example: 16.99,
                      minimum: 0,
                    },
                    categoryId: { type: "integer", example: 1 },
                    isAvailable: { type: "boolean", default: true },
                    isPopular: { type: "boolean", default: false },
                    ingredients: {
                      type: "array",
                      items: { type: "string" },
                      example: [
                        "tomato sauce",
                        "mozzarella cheese",
                        "fresh basil",
                      ],
                    },
                    allergens: {
                      type: "array",
                      items: { type: "string" },
                      example: ["gluten", "dairy"],
                    },
                    nutritionalInfo: {
                      type: "object",
                      properties: {
                        calories: { type: "integer", example: 320 },
                        protein: { type: "number", example: 12.5 },
                        carbs: { type: "number", example: 35.2 },
                        fat: { type: "number", example: 14.8 },
                      },
                    },
                    preparationTime: {
                      type: "integer",
                      example: 15,
                      minimum: 0,
                    },
                    sortOrder: { type: "integer", default: 0 },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Menu item created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          item: { $ref: "#/components/schemas/MenuItem" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/items/owner/restaurant": {
        get: {
          tags: ["Menu Items - Owner"],
          summary: "Get my restaurant's menu items",
          description:
            "Get all menu items for the authenticated user's restaurant",
          security: [{ userHeader: [] }],
          parameters: [
            {
              name: "category",
              in: "query",
              description: "Filter by category UUID",
              schema: { type: "string" },
            },
            {
              name: "available",
              in: "query",
              description: "Filter by availability",
              schema: { type: "boolean" },
            },
          ],
          responses: {
            200: {
              description: "Restaurant items retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          items: {
                            type: "array",
                            items: { $ref: "#/components/schemas/MenuItem" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/items/{itemUuid}": {
        put: {
          tags: ["Menu Items - Owner"],
          summary: "Update menu item",
          description: "Update an existing menu item",
          security: [{ userHeader: [] }],
          parameters: [{ $ref: "#/components/parameters/ItemUuid" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    price: { type: "number", minimum: 0 },
                    originalPrice: { type: "number", minimum: 0 },
                    categoryId: { type: "integer" },
                    isAvailable: { type: "boolean" },
                    isPopular: { type: "boolean" },
                    ingredients: {
                      type: "array",
                      items: { type: "string" },
                    },
                    allergens: {
                      type: "array",
                      items: { type: "string" },
                    },
                    nutritionalInfo: { type: "object" },
                    preparationTime: { type: "integer", minimum: 0 },
                    sortOrder: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Menu item updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          item: { $ref: "#/components/schemas/MenuItem" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
        delete: {
          tags: ["Menu Items - Owner"],
          summary: "Delete menu item",
          description: "Delete an existing menu item",
          security: [{ userHeader: [] }],
          parameters: [{ $ref: "#/components/parameters/ItemUuid" }],
          responses: {
            200: {
              description: "Menu item deleted successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/items/{itemUuid}/availability": {
        patch: {
          tags: ["Menu Items - Owner"],
          summary: "Toggle item availability",
          description: "Toggle the availability status of a menu item",
          security: [{ userHeader: [] }],
          parameters: [{ $ref: "#/components/parameters/ItemUuid" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["isAvailable"],
                  properties: {
                    isAvailable: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Item availability updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // Menu Routes
      "/menus/restaurant/{restaurantUuid}": {
        get: {
          tags: ["Menus - Public"],
          summary: "Get restaurant menus",
          description: "Get all menus for a specific restaurant",
          parameters: [
            { $ref: "#/components/parameters/RestaurantUuidParam" },
            {
              name: "available",
              in: "query",
              description: "Filter by availability",
              schema: { type: "boolean", default: true },
            },
          ],
          responses: {
            200: {
              description: "Restaurant menus retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          menus: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Menu" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/menus": {
        post: {
          tags: ["Menus - Owner"],
          summary: "Create a new menu",
          description: "Create a new menu for the restaurant",
          security: [{ userHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", example: "Dinner Menu" },
                    description: {
                      type: "string",
                      example: "Our evening dinner selection",
                    },
                    isActive: { type: "boolean", default: true },
                    isAvailable: { type: "boolean", default: true },
                    availableFrom: {
                      type: "string",
                      format: "time",
                      example: "17:00",
                    },
                    availableUntil: {
                      type: "string",
                      format: "time",
                      example: "23:00",
                    },
                    sortOrder: { type: "integer", default: 0 },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Menu created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          menu: { $ref: "#/components/schemas/Menu" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/menus/owner/restaurant": {
        get: {
          tags: ["Menus - Owner"],
          summary: "Get my restaurant's menus",
          description: "Get all menus for the authenticated user's restaurant",
          security: [{ userHeader: [] }],
          responses: {
            200: {
              description: "Restaurant menus retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          menus: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Menu" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/menus/{menuUuid}": {
        get: {
          tags: ["Menus - Owner"],
          summary: "Get menu details",
          description: "Get detailed information about a specific menu",
          security: [{ userHeader: [] }],
          parameters: [{ $ref: "#/components/parameters/MenuUuid" }],
          responses: {
            200: {
              description: "Menu details retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          menu: { $ref: "#/components/schemas/Menu" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
        put: {
          tags: ["Menus - Owner"],
          summary: "Update menu",
          description: "Update an existing menu",
          security: [{ userHeader: [] }],
          parameters: [{ $ref: "#/components/parameters/MenuUuid" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    isActive: { type: "boolean" },
                    isAvailable: { type: "boolean" },
                    availableFrom: { type: "string", format: "time" },
                    availableUntil: { type: "string", format: "time" },
                    sortOrder: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Menu updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          menu: { $ref: "#/components/schemas/Menu" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
        delete: {
          tags: ["Menus - Owner"],
          summary: "Delete menu",
          description: "Delete an existing menu",
          security: [{ userHeader: [] }],
          parameters: [{ $ref: "#/components/parameters/MenuUuid" }],
          responses: {
            200: {
              description: "Menu deleted successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/menus/{menuUuid}/availability": {
        patch: {
          tags: ["Menus - Owner"],
          summary: "Toggle menu availability",
          description: "Toggle the availability status of a menu",
          security: [{ userHeader: [] }],
          parameters: [{ $ref: "#/components/parameters/MenuUuid" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["isAvailable"],
                  properties: {
                    isAvailable: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Menu availability updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/menus/{menuUuid}/duplicate": {
        post: {
          tags: ["Menus - Owner"],
          summary: "Duplicate menu",
          description: "Create a duplicate of an existing menu",
          security: [{ userHeader: [] }],
          parameters: [{ $ref: "#/components/parameters/MenuUuid" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", example: "Copy of Dinner Menu" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Menu duplicated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          menu: { $ref: "#/components/schemas/Menu" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/menus/bulk/availability": {
        patch: {
          tags: ["Menus - Owner"],
          summary: "Bulk update menu availability",
          description: "Update availability for multiple menus at once",
          security: [{ userHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["menuUuids", "isAvailable"],
                  properties: {
                    menuUuids: {
                      type: "array",
                      items: { type: "string" },
                      example: ["menu-uuid-1", "menu-uuid-2"],
                    },
                    isAvailable: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Menu availability updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          updated: { type: "integer", example: 2 },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/menus/owner/analytics": {
        get: {
          tags: ["Menus - Owner"],
          summary: "Get menu analytics",
          description: "Get analytics data for restaurant menus",
          security: [{ userHeader: [] }],
          parameters: [
            {
              name: "period",
              in: "query",
              description: "Analytics period",
              schema: {
                type: "string",
                enum: ["day", "week", "month", "year"],
                default: "month",
              },
            },
          ],
          responses: {
            200: {
              description: "Menu analytics retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          analytics: {
                            type: "object",
                            properties: {
                              totalMenus: { type: "integer" },
                              activeMenus: { type: "integer" },
                              menuViews: { type: "integer" },
                              popularMenus: {
                                type: "array",
                                items: { $ref: "#/components/schemas/Menu" },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // Category Routes
      "/categories": {
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
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          categories: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Category" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/categories/{uuid}": {
        get: {
          tags: ["Categories"],
          summary: "Get category details",
          description:
            "Retrieve detailed information about a specific category",
          parameters: [{ $ref: "#/components/parameters/CategoryUuid" }],
          responses: {
            200: {
              description: "Category details retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          category: { $ref: "#/components/schemas/Category" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // Review Routes
      "/reviews/restaurant/{restaurantUuid}": {
        get: {
          tags: ["Reviews"],
          summary: "Get restaurant reviews",
          description: "Get all reviews for a specific restaurant",
          parameters: [
            { $ref: "#/components/parameters/RestaurantUuidParam" },
            { $ref: "#/components/parameters/PageParam" },
            { $ref: "#/components/parameters/LimitParam" },
            { $ref: "#/components/parameters/RatingFilter" },
          ],
          responses: {
            200: {
              description: "Restaurant reviews retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          reviews: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Review" },
                          },
                          pagination: {
                            $ref: "#/components/schemas/PaginationInfo",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/reviews": {
        post: {
          tags: ["Reviews"],
          summary: "Create a review",
          description:
            "Create a new review for a restaurant (requires authentication)",
          security: [{ userHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["restaurantUuid", "rating"],
                  properties: {
                    restaurantUuid: {
                      type: "string",
                      example: "restaurant-uuid-123",
                    },
                    rating: {
                      type: "integer",
                      minimum: 1,
                      maximum: 5,
                      example: 4,
                    },
                    title: {
                      type: "string",
                      example: "Great food and service!",
                    },
                    comment: {
                      type: "string",
                      example: "Had an amazing dinner here.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Review created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          review: { $ref: "#/components/schemas/Review" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // Statistics Routes
      "/stats/restaurant": {
        get: {
          tags: ["Statistics"],
          summary: "Get restaurant statistics",
          description: "Get detailed statistics for the restaurant",
          security: [{ userHeader: [] }],
          parameters: [
            {
              name: "period",
              in: "query",
              description: "Statistics period",
              schema: {
                type: "string",
                enum: ["day", "week", "month", "year"],
                default: "month",
              },
            },
          ],
          responses: {
            200: {
              description: "Restaurant statistics retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          statistics: {
                            $ref: "#/components/schemas/RestaurantStats",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/stats/restaurant/daily": {
        post: {
          tags: ["Statistics"],
          summary: "Update daily statistics",
          description: "Update daily statistics for the restaurant",
          security: [{ userHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["date"],
                  properties: {
                    date: {
                      type: "string",
                      format: "date",
                      example: "2025-06-19",
                    },
                    orders: { type: "integer", example: 25 },
                    revenue: { type: "number", example: 750.5 },
                    customers: { type: "integer", example: 20 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Daily statistics updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/stats/restaurant/summary": {
        get: {
          tags: ["Statistics"],
          summary: "Get statistics summary",
          description: "Get a summary of key restaurant statistics",
          security: [{ userHeader: [] }],
          responses: {
            200: {
              description: "Statistics summary retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          summary: {
                            type: "object",
                            properties: {
                              todayOrders: { type: "integer" },
                              todayRevenue: { type: "number" },
                              monthOrders: { type: "integer" },
                              monthRevenue: { type: "number" },
                              averageRating: { type: "number" },
                              totalReviews: { type: "integer" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/stats/restaurant/report": {
        get: {
          tags: ["Statistics"],
          summary: "Generate statistics report",
          description: "Generate a comprehensive statistics report",
          security: [{ userHeader: [] }],
          parameters: [
            {
              name: "startDate",
              in: "query",
              required: true,
              description: "Report start date (YYYY-MM-DD)",
              schema: { type: "string", format: "date" },
            },
            {
              name: "endDate",
              in: "query",
              required: true,
              description: "Report end date (YYYY-MM-DD)",
              schema: { type: "string", format: "date" },
            },
            {
              name: "format",
              in: "query",
              description: "Report format",
              schema: {
                type: "string",
                enum: ["json", "csv", "pdf"],
                default: "json",
              },
            },
          ],
          responses: {
            200: {
              description: "Statistics report generated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          report: {
                            type: "object",
                            properties: {
                              period: {
                                type: "object",
                                properties: {
                                  startDate: { type: "string", format: "date" },
                                  endDate: { type: "string", format: "date" },
                                },
                              },
                              summary: {
                                $ref: "#/components/schemas/RestaurantStats",
                              },
                              downloadUrl: { type: "string", format: "uri" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/stats/restaurant/benchmarks": {
        get: {
          tags: ["Statistics"],
          summary: "Get industry benchmarks",
          description: "Get industry benchmarks and comparison data",
          security: [{ userHeader: [] }],
          parameters: [
            {
              name: "cuisine",
              in: "query",
              description: "Filter benchmarks by cuisine type",
              schema: { type: "string" },
            },
            {
              name: "region",
              in: "query",
              description: "Filter benchmarks by region",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Industry benchmarks retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          benchmarks: {
                            type: "object",
                            properties: {
                              averageOrderValue: {
                                type: "object",
                                properties: {
                                  industry: { type: "number" },
                                  cuisine: { type: "number" },
                                  region: { type: "number" },
                                },
                              },
                              customerRating: {
                                type: "object",
                                properties: {
                                  industry: { type: "number" },
                                  cuisine: { type: "number" },
                                  region: { type: "number" },
                                },
                              },
                              monthlyOrders: {
                                type: "object",
                                properties: {
                                  industry: { type: "integer" },
                                  cuisine: { type: "integer" },
                                  region: { type: "integer" },
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            500: { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for user authentication",
        },
        userHeader: {
          type: "apiKey",
          in: "header",
          name: "x-user-id",
          description: "User ID header for authentication",
        },
      },
      schemas: {
        // Core Restaurant Schema
        Restaurant: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique restaurant identifier",
            },
            uuid: {
              type: "string",
              description: "Public restaurant UUID",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            name: {
              type: "string",
              description: "Restaurant name",
              example: "Mario's Italian Bistro",
            },
            description: {
              type: "string",
              description: "Restaurant description",
              example: "Authentic Italian cuisine in the heart of the city",
            },
            cuisine: {
              type: "string",
              description: "Type of cuisine",
              example: "Italian",
            },
            address: {
              $ref: "#/components/schemas/Address",
            },
            phone: {
              type: "string",
              description: "Restaurant phone number",
              example: "+1-555-123-4567",
            },
            email: {
              type: "string",
              format: "email",
              description: "Restaurant email address",
            },
            website: {
              type: "string",
              format: "uri",
              description: "Restaurant website URL",
            },
            rating: {
              type: "number",
              minimum: 0,
              maximum: 5,
              description: "Average restaurant rating",
              example: 4.5,
            },
            reviewCount: {
              type: "integer",
              description: "Total number of reviews",
              example: 127,
            },
            priceRange: {
              type: "string",
              enum: ["$", "$$", "$$$", "$$$$"],
              description: "Price range indicator",
            },
            operatingHours: {
              type: "object",
              description: "Operating hours for each day",
              properties: {
                monday: { type: "string", example: "9:00-22:00" },
                tuesday: { type: "string", example: "9:00-22:00" },
                wednesday: { type: "string", example: "9:00-22:00" },
                thursday: { type: "string", example: "9:00-22:00" },
                friday: { type: "string", example: "9:00-23:00" },
                saturday: { type: "string", example: "10:00-23:00" },
                sunday: { type: "string", example: "10:00-21:00" },
              },
            },
            isActive: {
              type: "boolean",
              description: "Whether the restaurant is active",
              default: true,
            },
            isOpen: {
              type: "boolean",
              description: "Whether the restaurant is currently open",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Restaurant tags/features",
              example: ["delivery", "takeout", "outdoor-seating"],
            },
            images: {
              type: "array",
              items: {
                type: "string",
                format: "uri",
              },
              description: "Restaurant image URLs",
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

        // Menu Item Schema
        MenuItem: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique item identifier",
            },
            uuid: {
              type: "string",
              description: "Public item UUID",
            },
            name: {
              type: "string",
              description: "Item name",
              example: "Margherita Pizza",
            },
            description: {
              type: "string",
              description: "Item description",
              example:
                "Classic pizza with tomato sauce, mozzarella, and fresh basil",
            },
            price: {
              type: "number",
              description: "Item price",
              example: 14.99,
            },
            originalPrice: {
              type: "number",
              description: "Original price (if on sale)",
              example: 16.99,
            },
            categoryId: {
              type: "integer",
              description: "Associated category ID",
            },
            category: {
              $ref: "#/components/schemas/Category",
            },
            restaurantId: {
              type: "integer",
              description: "Associated restaurant ID",
            },
            isAvailable: {
              type: "boolean",
              description: "Whether the item is currently available",
              default: true,
            },
            isPopular: {
              type: "boolean",
              description: "Whether the item is marked as popular",
              default: false,
            },
            ingredients: {
              type: "array",
              items: {
                type: "string",
              },
              description: "List of ingredients",
              example: ["tomato sauce", "mozzarella cheese", "fresh basil"],
            },
            allergens: {
              type: "array",
              items: {
                type: "string",
              },
              description: "List of allergens",
              example: ["gluten", "dairy"],
            },
            nutritionalInfo: {
              type: "object",
              properties: {
                calories: { type: "integer", example: 320 },
                protein: { type: "number", example: 12.5 },
                carbs: { type: "number", example: 35.2 },
                fat: { type: "number", example: 14.8 },
              },
            },
            images: {
              type: "array",
              items: {
                type: "string",
                format: "uri",
              },
              description: "Item image URLs",
            },
            preparationTime: {
              type: "integer",
              description: "Estimated preparation time in minutes",
              example: 15,
            },
            sortOrder: {
              type: "integer",
              description: "Display order within category",
              default: 0,
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

        // Menu Schema
        Menu: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique menu identifier",
            },
            uuid: {
              type: "string",
              description: "Public menu UUID",
            },
            name: {
              type: "string",
              description: "Menu name",
              example: "Dinner Menu",
            },
            description: {
              type: "string",
              description: "Menu description",
              example: "Our evening dinner selection",
            },
            restaurantId: {
              type: "integer",
              description: "Associated restaurant ID",
            },
            isActive: {
              type: "boolean",
              description: "Whether the menu is active",
              default: true,
            },
            isAvailable: {
              type: "boolean",
              description: "Whether the menu is currently available",
              default: true,
            },
            availableFrom: {
              type: "string",
              format: "time",
              description: "Time when menu becomes available",
              example: "17:00",
            },
            availableUntil: {
              type: "string",
              format: "time",
              description: "Time when menu stops being available",
              example: "23:00",
            },
            categories: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Category",
              },
              description: "Menu categories",
            },
            items: {
              type: "array",
              items: {
                $ref: "#/components/schemas/MenuItem",
              },
              description: "Menu items",
            },
            sortOrder: {
              type: "integer",
              description: "Display order",
              default: 0,
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

        // Category Schema
        Category: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique category identifier",
            },
            uuid: {
              type: "string",
              description: "Public category UUID",
            },
            name: {
              type: "string",
              description: "Category name",
              example: "Appetizers",
            },
            description: {
              type: "string",
              description: "Category description",
              example: "Start your meal with our delicious appetizers",
            },
            isActive: {
              type: "boolean",
              description: "Whether the category is active",
              default: true,
            },
            sortOrder: {
              type: "integer",
              description: "Display order",
              default: 0,
            },
            icon: {
              type: "string",
              description: "Category icon URL or identifier",
            },
            color: {
              type: "string",
              description: "Category color code",
              example: "#FF5722",
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

        // Review Schema
        Review: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique review identifier",
            },
            uuid: {
              type: "string",
              description: "Public review UUID",
            },
            restaurantId: {
              type: "integer",
              description: "Associated restaurant ID",
            },
            customerId: {
              type: "string",
              description: "Customer identifier",
            },
            customerName: {
              type: "string",
              description: "Customer name",
              example: "John D.",
            },
            rating: {
              type: "integer",
              minimum: 1,
              maximum: 5,
              description: "Review rating",
              example: 4,
            },
            title: {
              type: "string",
              description: "Review title",
              example: "Great food and service!",
            },
            comment: {
              type: "string",
              description: "Review comment",
              example:
                "Had an amazing dinner here. The pasta was perfectly cooked and the service was excellent.",
            },
            isVisible: {
              type: "boolean",
              description: "Whether the review is visible to public",
              default: true,
            },
            isVerified: {
              type: "boolean",
              description: "Whether the review is from a verified customer",
              default: false,
            },
            helpfulCount: {
              type: "integer",
              description: "Number of helpful votes",
              default: 0,
            },
            response: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "Restaurant's response to the review",
                },
                respondedAt: {
                  type: "string",
                  format: "date-time",
                  description: "When the restaurant responded",
                },
              },
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
          },
        },

        // Address Input Schema (for requests)
        AddressInput: {
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
          },
        },

        // Statistics Schemas
        RestaurantStats: {
          type: "object",
          properties: {
            totalOrders: {
              type: "integer",
              description: "Total number of orders",
            },
            totalRevenue: {
              type: "number",
              description: "Total revenue generated",
            },
            averageOrderValue: {
              type: "number",
              description: "Average order value",
            },
            totalCustomers: {
              type: "integer",
              description: "Total number of unique customers",
            },
            averageRating: {
              type: "number",
              minimum: 0,
              maximum: 5,
              description: "Average customer rating",
            },
            totalReviews: {
              type: "integer",
              description: "Total number of reviews",
            },
            popularItems: {
              type: "array",
              items: {
                $ref: "#/components/schemas/MenuItem",
              },
              description: "Most popular menu items",
            },
            monthlyTrends: {
              type: "object",
              properties: {
                orders: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      month: { type: "string" },
                      count: { type: "integer" },
                    },
                  },
                },
                revenue: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      month: { type: "string" },
                      amount: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },

        // Pagination Info Schema
        PaginationInfo: {
          type: "object",
          properties: {
            currentPage: {
              type: "integer",
              description: "Current page number",
            },
            totalPages: {
              type: "integer",
              description: "Total number of pages",
            },
            totalCount: {
              type: "integer",
              description: "Total number of items",
            },
            limit: {
              type: "integer",
              description: "Number of items per page",
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
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Response timestamp",
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
        RestaurantUuid: {
          name: "uuid",
          in: "path",
          required: true,
          description: "Restaurant UUID",
          schema: {
            type: "string",
          },
        },
        RestaurantUuidParam: {
          name: "restaurantUuid",
          in: "path",
          required: true,
          description: "Restaurant UUID",
          schema: {
            type: "string",
          },
        },
        ItemUuid: {
          name: "itemUuid",
          in: "path",
          required: true,
          description: "Menu item UUID",
          schema: {
            type: "string",
          },
        },
        MenuUuid: {
          name: "menuUuid",
          in: "path",
          required: true,
          description: "Menu UUID",
          schema: {
            type: "string",
          },
        },
        CategoryUuid: {
          name: "uuid",
          in: "path",
          required: true,
          description: "Category UUID",
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
        SearchQuery: {
          name: "q",
          in: "query",
          description: "Search query string",
          schema: {
            type: "string",
          },
        },
        RatingFilter: {
          name: "rating",
          in: "query",
          description: "Filter by rating",
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 5,
          },
        },
      },
    },

    tags: [
      {
        name: "Service Info",
        description: "Service information and health checks",
      },
      {
        name: "Restaurants - Public",
        description: "Public restaurant information and search",
      },
      {
        name: "Restaurants - Owner",
        description: "Restaurant owner management operations",
      },
      {
        name: "Menu Items - Public",
        description: "Public menu item information and search",
      },
      {
        name: "Menu Items - Owner",
        description: "Menu item management for restaurant owners",
      },
      {
        name: "Menus - Public",
        description: "Public menu information",
      },
      {
        name: "Menus - Owner",
        description: "Menu management for restaurant owners",
      },
      {
        name: "Categories",
        description: "Category management and information",
      },
      {
        name: "Reviews",
        description: "Review management and display",
      },
      {
        name: "Statistics",
        description: "Restaurant statistics and analytics",
      },
    ],
  },
  apis: [
    "./routes/*.js",
    "./routes/index.js",
    "./routes/restaurantRoutes.js",
    "./routes/itemRoutes.js",
    "./routes/menuRoutes.js",
    "./routes/categoryRoutes.js",
    "./routes/reviewRoutes.js",
    "./routes/statsRoutes.js",
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
      customSiteTitle: "Restaurant Management API Documentation",
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
