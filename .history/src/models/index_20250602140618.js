// models/index.js
const { Sequelize } = require("sequelize");
const config = require("../config/database");

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: config.logging || false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const db = {};

// Import models
db.User = require("./User")(sequelize, Sequelize.DataTypes);
db.Item = require("./Item")(sequelize, Sequelize.DataTypes);
db.Menu = require("./Menu")(sequelize, Sequelize.DataTypes);
db.MenuItems = require("./MenuItems")(sequelize, Sequelize.DataTypes);
db.Order = require("./Order")(sequelize, Sequelize.DataTypes);
db.OrderItem = require("./OrderItem")(sequelize, Sequelize.DataTypes);
db.Delivery = require("./Delivery")(sequelize, Sequelize.DataTypes);
db.Referral = require("./Referral")(sequelize, Sequelize.DataTypes);
db.Notification = require("./Notification")(sequelize, Sequelize.DataTypes);
db.ApiKey = require("./ApiKey")(sequelize, Sequelize.DataTypes);
db.ReusableComponent = require("./ReusableComponent")(
  sequelize,
  Sequelize.DataTypes
);
db.ComponentDownload = require("./ComponentDownload")(
  sequelize,
  Sequelize.DataTypes
);
db.ConnectionLog = require("./ConnectionLog")(sequelize, Sequelize.DataTypes);
db.PerformanceStats = require("./PerformanceStats")(
  sequelize,
  Sequelize.DataTypes
);
db.RestaurantStats = require("./RestaurantStats")(
  sequelize,
  Sequelize.DataTypes
);

// Define associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "password_hash",
      },
      userType: {
        type: DataTypes.ENUM(
          "end_user",
          "restaurant_owner",
          "delivery_driver",
          "developer",
          "sales_dept",
          "tech_support"
        ),
        allowNull: false,
        field: "user_type",
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "first_name",
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "last_name",
      },
      phone: {
        type: DataTypes.STRING(20),
      },
      address: {
        type: DataTypes.TEXT,
      },
      city: {
        type: DataTypes.STRING(100),
      },
      postalCode: {
        type: DataTypes.STRING(20),
        field: "postal_code",
      },
      country: {
        type: DataTypes.STRING(100),
        defaultValue: "France",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_verified",
      },
      lastLogin: {
        type: DataTypes.DATE,
        field: "last_login",
      },
      // Restaurant owner specific fields
      restaurantName: {
        type: DataTypes.STRING,
        field: "restaurant_name",
      },
      restaurantDescription: {
        type: DataTypes.TEXT,
        field: "restaurant_description",
      },
      restaurantAddress: {
        type: DataTypes.TEXT,
        field: "restaurant_address",
      },
      restaurantPhone: {
        type: DataTypes.STRING(20),
        field: "restaurant_phone",
      },
      cuisineType: {
        type: DataTypes.STRING(100),
        field: "cuisine_type",
      },
      // Delivery driver specific fields
      vehicleType: {
        type: DataTypes.ENUM("bike", "scooter", "car", "walking"),
        field: "vehicle_type",
      },
      licenseNumber: {
        type: DataTypes.STRING(50),
        field: "license_number",
      },
      isAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_available",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_type"] },
        { fields: ["email"] },
        { fields: ["is_active"] },
      ],
    }
  );

  User.associate = function (models) {
    // Restaurant owner associations
    User.hasMany(models.Item, { foreignKey: "restaurantId", as: "items" });
    User.hasMany(models.Menu, { foreignKey: "restaurantId", as: "menus" });
    User.hasMany(models.RestaurantStats, {
      foreignKey: "restaurantId",
      as: "stats",
    });

    // Customer associations
    User.hasMany(models.Order, {
      foreignKey: "customerId",
      as: "customerOrders",
    });

    // Restaurant associations
    User.hasMany(models.Order, {
      foreignKey: "restaurantId",
      as: "restaurantOrders",
    });

    // Driver associations
    User.hasMany(models.Order, {
      foreignKey: "deliveryDriverId",
      as: "driverOrders",
    });
    User.hasMany(models.Delivery, { foreignKey: "driverId", as: "deliveries" });

    // Referral associations
    User.hasMany(models.Referral, {
      foreignKey: "referrerId",
      as: "referralsMade",
    });
    User.hasMany(models.Referral, {
      foreignKey: "referredId",
      as: "referralsReceived",
    });

    // Notification associations
    User.hasMany(models.Notification, {
      foreignKey: "userId",
      as: "notifications",
    });

    // Developer associations
    User.hasMany(models.ApiKey, { foreignKey: "developerId", as: "apiKeys" });
    User.hasMany(models.ComponentDownload, {
      foreignKey: "developerId",
      as: "downloads",
    });
  };

  // Instance methods
  User.prototype.getFullName = function () {
    return `${this.firstName} ${this.lastName}`;
  };

  User.prototype.isRestaurantOwner = function () {
    return this.userType === "restaurant_owner";
  };

  User.prototype.isDeliveryDriver = function () {
    return this.userType === "delivery_driver";
  };

  User.prototype.isEndUser = function () {
    return this.userType === "end_user";
  };

  return User;
};

// models/Item.js
module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define(
    "Item",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      restaurantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "restaurant_id",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      category: {
        type: DataTypes.ENUM(
          "dish",
          "beverage",
          "sauce",
          "side_dish",
          "dessert"
        ),
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING(500),
        field: "image_url",
      },
      isAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_available",
      },
      preparationTime: {
        type: DataTypes.INTEGER,
        defaultValue: 15,
        field: "preparation_time",
      },
      allergens: {
        type: DataTypes.TEXT, // JSON string
      },
      nutritionalInfo: {
        type: DataTypes.TEXT, // JSON string
        field: "nutritional_info",
      },
    },
    {
      tableName: "items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["restaurant_id"] },
        { fields: ["category"] },
        { fields: ["is_available"] },
      ],
    }
  );

  Item.associate = function (models) {
    Item.belongsTo(models.User, {
      foreignKey: "restaurantId",
      as: "restaurant",
    });
    Item.belongsToMany(models.Menu, {
      through: models.MenuItems,
      foreignKey: "itemId",
      otherKey: "menuId",
      as: "menus",
    });
    Item.hasMany(models.OrderItem, { foreignKey: "itemId", as: "orderItems" });
  };

  return Item;
};

// models/Menu.js
module.exports = (sequelize, DataTypes) => {
  const Menu = sequelize.define(
    "Menu",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      restaurantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "restaurant_id",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      isAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_available",
      },
    },
    {
      tableName: "menus",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["restaurant_id"] }],
    }
  );

  Menu.associate = function (models) {
    Menu.belongsTo(models.User, {
      foreignKey: "restaurantId",
      as: "restaurant",
    });
    Menu.belongsToMany(models.Item, {
      through: models.MenuItems,
      foreignKey: "menuId",
      otherKey: "itemId",
      as: "items",
    });
    Menu.hasMany(models.OrderItem, { foreignKey: "menuId", as: "orderItems" });
  };

  return Menu;
};

// models/MenuItems.js
module.exports = (sequelize, DataTypes) => {
  const MenuItems = sequelize.define(
    "MenuItems",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      menuId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "menu_id",
      },
      itemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "item_id",
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
    },
    {
      tableName: "menu_items",
      timestamps: false,
    }
  );

  MenuItems.associate = function (models) {
    MenuItems.belongsTo(models.Menu, { foreignKey: "menuId" });
    MenuItems.belongsTo(models.Item, { foreignKey: "itemId" });
  };

  return MenuItems;
};

// models/Order.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "customer_id",
      },
      restaurantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "restaurant_id",
      },
      deliveryDriverId: {
        type: DataTypes.INTEGER,
        field: "delivery_driver_id",
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "confirmed",
          "preparing",
          "ready",
          "picked_up",
          "delivering",
          "delivered",
          "cancelled"
        ),
        defaultValue: "pending",
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "total_amount",
      },
      deliveryFee: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        field: "delivery_fee",
      },
      taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        field: "tax_amount",
      },
      deliveryAddress: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "delivery_address",
      },
      deliveryCity: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "delivery_city",
      },
      deliveryPostalCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: "delivery_postal_code",
      },
      deliveryPhone: {
        type: DataTypes.STRING(20),
        field: "delivery_phone",
      },
      deliveryNotes: {
        type: DataTypes.TEXT,
        field: "delivery_notes",
      },
      orderedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "ordered_at",
      },
      confirmedAt: {
        type: DataTypes.DATE,
        field: "confirmed_at",
      },
      readyAt: {
        type: DataTypes.DATE,
        field: "ready_at",
      },
      pickedUpAt: {
        type: DataTypes.DATE,
        field: "picked_up_at",
      },
      deliveredAt: {
        type: DataTypes.DATE,
        field: "delivered_at",
      },
      estimatedDeliveryTime: {
        type: DataTypes.DATE,
        field: "estimated_delivery_time",
      },
      paymentStatus: {
        type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
        defaultValue: "pending",
        field: "payment_status",
      },
      paymentMethod: {
        type: DataTypes.STRING(50),
        field: "payment_method",
      },
      paymentTransactionId: {
        type: DataTypes.STRING,
        field: "payment_transaction_id",
      },
    },
    {
      tableName: "orders",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["customer_id"] },
        { fields: ["restaurant_id"] },
        { fields: ["delivery_driver_id"] },
        { fields: ["status"] },
        { fields: ["ordered_at"] },
      ],
    }
  );

  Order.associate = function (models) {
    Order.belongsTo(models.User, { foreignKey: "customerId", as: "customer" });
    Order.belongsTo(models.User, {
      foreignKey: "restaurantId",
      as: "restaurant",
    });
    Order.belongsTo(models.User, {
      foreignKey: "deliveryDriverId",
      as: "driver",
    });
    Order.hasMany(models.OrderItem, { foreignKey: "orderId", as: "items" });
    Order.hasOne(models.Delivery, { foreignKey: "orderId", as: "delivery" });
  };

  return Order;
};

// models/OrderItem.js
module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    "OrderItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "order_id",
      },
      itemId: {
        type: DataTypes.INTEGER,
        field: "item_id",
      },
      menuId: {
        type: DataTypes.INTEGER,
        field: "menu_id",
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "unit_price",
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "total_price",
      },
      specialInstructions: {
        type: DataTypes.TEXT,
        field: "special_instructions",
      },
    },
    {
      tableName: "order_items",
      timestamps: false,
      indexes: [{ fields: ["order_id"] }],
    }
  );

  OrderItem.associate = function (models) {
    OrderItem.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });
    OrderItem.belongsTo(models.Item, { foreignKey: "itemId", as: "item" });
    OrderItem.belongsTo(models.Menu, { foreignKey: "menuId", as: "menu" });
  };

  return OrderItem;
};

// models/Delivery.js
module.exports = (sequelize, DataTypes) => {
  const Delivery = sequelize.define(
    "Delivery",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "order_id",
      },
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "driver_id",
      },
      status: {
        type: DataTypes.ENUM(
          "assigned",
          "picked_up",
          "in_transit",
          "delivered",
          "failed"
        ),
        defaultValue: "assigned",
      },
      pickupLatitude: {
        type: DataTypes.DECIMAL(10, 8),
        field: "pickup_latitude",
      },
      pickupLongitude: {
        type: DataTypes.DECIMAL(11, 8),
        field: "pickup_longitude",
      },
      deliveryLatitude: {
        type: DataTypes.DECIMAL(10, 8),
        field: "delivery_latitude",
      },
      deliveryLongitude: {
        type: DataTypes.DECIMAL(11, 8),
        field: "delivery_longitude",
      },
      currentLatitude: {
        type: DataTypes.DECIMAL(10, 8),
        field: "current_latitude",
      },
      currentLongitude: {
        type: DataTypes.DECIMAL(11, 8),
        field: "current_longitude",
      },
      estimatedArrival: {
        type: DataTypes.DATE,
        field: "estimated_arrival",
      },
      actualPickupTime: {
        type: DataTypes.DATE,
        field: "actual_pickup_time",
      },
      actualDeliveryTime: {
        type: DataTypes.DATE,
        field: "actual_delivery_time",
      },
      deliveryNotes: {
        type: DataTypes.TEXT,
        field: "delivery_notes",
      },
      qrCode: {
        type: DataTypes.STRING,
        field: "qr_code",
      },
    },
    {
      tableName: "deliveries",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["order_id"] },
        { fields: ["driver_id"] },
        { fields: ["status"] },
      ],
    }
  );

  Delivery.associate = function (models) {
    Delivery.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });
    Delivery.belongsTo(models.User, { foreignKey: "driverId", as: "driver" });
  };

  return Delivery;
};

// models/Notification.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      data: {
        type: DataTypes.JSON,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_read",
      },
      readAt: {
        type: DataTypes.DATE,
        field: "read_at",
      },
    },
    {
      tableName: "notifications",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["user_id", "is_read"] },
        { fields: ["type"] },
      ],
    }
  );

  Notification.associate = function (models) {
    Notification.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };

  return Notification;
};

// models/Referral.js
module.exports = (sequelize, DataTypes) => {
  const Referral = sequelize.define(
    "Referral",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      referrerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "referrer_id",
      },
      referredId: {
        type: DataTypes.INTEGER,
        field: "referred_id",
      },
      referralCode: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        field: "referral_code",
      },
      referredEmail: {
        type: DataTypes.STRING,
        field: "referred_email",
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "expired"),
        defaultValue: "pending",
      },
      rewardAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        field: "reward_amount",
      },
      rewardClaimed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "reward_claimed",
      },
      completedAt: {
        type: DataTypes.DATE,
        field: "completed_at",
      },
    },
    {
      tableName: "referrals",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [{ fields: ["referrer_id"] }, { fields: ["referral_code"] }],
    }
  );

  Referral.associate = function (models) {
    Referral.belongsTo(models.User, {
      foreignKey: "referrerId",
      as: "referrer",
    });
    Referral.belongsTo(models.User, {
      foreignKey: "referredId",
      as: "referred",
    });
  };

  return Referral;
};

// models/ApiKey.js
module.exports = (sequelize, DataTypes) => {
  const ApiKey = sequelize.define(
    "ApiKey",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      developerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "developer_id",
      },
      keyName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "key_name",
      },
      apiKey: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        field: "api_key",
      },
      apiSecret: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "api_secret",
      },
      permissions: {
        type: DataTypes.JSON,
      },
      rateLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 1000,
        field: "rate_limit",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        field: "last_used_at",
      },
      expiresAt: {
        type: DataTypes.DATE,
        field: "expires_at",
      },
    },
    {
      tableName: "api_keys",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [{ fields: ["developer_id"] }, { fields: ["api_key"] }],
    }
  );

  ApiKey.associate = function (models) {
    ApiKey.belongsTo(models.User, {
      foreignKey: "developerId",
      as: "developer",
    });
    ApiKey.hasMany(models.ConnectionLog, {
      foreignKey: "apiKeyId",
      as: "logs",
    });
  };

  return ApiKey;
};

// models/ReusableComponent.js
module.exports = (sequelize, DataTypes) => {
  const ReusableComponent = sequelize.define(
    "ReusableComponent",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      version: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
      },
      filePath: {
        type: DataTypes.STRING(500),
        field: "file_path",
      },
      fileSize: {
        type: DataTypes.BIGINT,
        field: "file_size",
      },
      downloadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "download_count",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      createdBy: {
        type: DataTypes.INTEGER,
        field: "created_by",
      },
    },
    {
      tableName: "reusable_components",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["category"] }, { fields: ["is_active"] }],
    }
  );

  ReusableComponent.associate = function (models) {
    ReusableComponent.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });
    ReusableComponent.hasMany(models.ComponentDownload, {
      foreignKey: "componentId",
      as: "downloads",
    });
  };

  return ReusableComponent;
};

// models/ComponentDownload.js
module.exports = (sequelize, DataTypes) => {
  const ComponentDownload = sequelize.define(
    "ComponentDownload",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      componentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "component_id",
      },
      developerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "developer_id",
      },
      downloadTimestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "download_timestamp",
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        field: "ip_address",
      },
      userAgent: {
        type: DataTypes.TEXT,
        field: "user_agent",
      },
    },
    {
      tableName: "component_downloads",
      timestamps: false,
      indexes: [
        { fields: ["component_id"] },
        { fields: ["developer_id"] },
        { fields: ["download_timestamp"] },
      ],
    }
  );

  ComponentDownload.associate = function (models) {
    ComponentDownload.belongsTo(models.ReusableComponent, {
      foreignKey: "componentId",
      as: "component",
    });
    ComponentDownload.belongsTo(models.User, {
      foreignKey: "developerId",
      as: "developer",
    });
  };

  return ComponentDownload;
};

// models/ConnectionLog.js
module.exports = (sequelize, DataTypes) => {
  const ConnectionLog = sequelize.define(
    "ConnectionLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        field: "user_id",
      },
      apiKeyId: {
        type: DataTypes.INTEGER,
        field: "api_key_id",
      },
      endpoint: {
        type: DataTypes.STRING,
      },
      method: {
        type: DataTypes.STRING(10),
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        field: "ip_address",
      },
      userAgent: {
        type: DataTypes.TEXT,
        field: "user_agent",
      },
      requestBody: {
        type: DataTypes.TEXT,
        field: "request_body",
      },
      responseStatus: {
        type: DataTypes.INTEGER,
        field: "response_status",
      },
      responseTimeMs: {
        type: DataTypes.INTEGER,
        field: "response_time_ms",
      },
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "connection_logs",
      timestamps: false,
      indexes: [
        { fields: ["timestamp"] },
        { fields: ["endpoint"] },
        { fields: ["user_id"] },
      ],
    }
  );

  ConnectionLog.associate = function (models) {
    ConnectionLog.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    ConnectionLog.belongsTo(models.ApiKey, {
      foreignKey: "apiKeyId",
      as: "apiKey",
    });
  };

  return ConnectionLog;
};

// models/PerformanceStats.js
module.exports = (sequelize, DataTypes) => {
  const PerformanceStats = sequelize.define(
    "PerformanceStats",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      serverName: {
        type: DataTypes.STRING(100),
        field: "server_name",
      },
      serviceName: {
        type: DataTypes.STRING(100),
        field: "service_name",
      },
      metricName: {
        type: DataTypes.STRING(100),
        field: "metric_name",
      },
      metricValue: {
        type: DataTypes.DECIMAL(15, 4),
        field: "metric_value",
      },
      unit: {
        type: DataTypes.STRING(50),
      },
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      additionalData: {
        type: DataTypes.JSON,
        field: "additional_data",
      },
    },
    {
      tableName: "performance_stats",
      timestamps: false,
      indexes: [
        { fields: ["timestamp"] },
        { fields: ["server_name", "service_name"] },
        { fields: ["metric_name"] },
      ],
    }
  );

  return PerformanceStats;
};

// models/RestaurantStats.js




// // Example usage in your app.js or server.js
// const db = require("./models");

// // Sync database (for development)
// async function initializeDatabase() {
//   try {
//     await db.sequelize.authenticate();
//     console.log("Database connection has been established successfully.");

//     // Sync all models (create tables if they don't exist)
//     await db.sequelize.sync({ alter: true }); // Use { force: true } to drop and recreate tables
//     console.log("All models were synchronized successfully.");
//   } catch (error) {
//     console.error("Unable to connect to the database:", error);
//   }
// }

// // Example of creating a user
// async function createSampleUser() {
//   try {
//     const user = await db.User.create({
//       email: "customer@example.com",
//       passwordHash: "$2b$10$hashedpassword",
//       userType: "end_user",
//       firstName: "John",
//       lastName: "Doe",
//       phone: "+33123456789",
//       address: "123 Main Street",
//       city: "Paris",
//       postalCode: "75001",
//       country: "France",
//     });

//     console.log("User created:", user.uuid);
//     return user;
//   } catch (error) {
//     console.error("Error creating user:", error);
//   }
// }

// // Example of creating an order with items
// async function createSampleOrder(customerId, restaurantId) {
//   const transaction = await db.sequelize.transaction();

//   try {
//     // Create the order
//     const order = await db.Order.create(
//       {
//         customerId,
//         restaurantId,
//         totalAmount: 25.5,
//         deliveryFee: 3.5,
//         taxAmount: 2.29,
//         deliveryAddress: "456 Customer Street",
//         deliveryCity: "Paris",
//         deliveryPostalCode: "75002",
//         deliveryPhone: "+33987654321",
//         paymentMethod: "credit_card",
//       },
//       { transaction }
//     );

//     // Add order items
//     await db.OrderItem.create(
//       {
//         orderId: order.id,
//         itemId: 1, // Assume item exists
//         quantity: 2,
//         unitPrice: 11.0,
//         totalPrice: 22.0,
//       },
//       { transaction }
//     );

//     await transaction.commit();
//     console.log("Order created:", order.uuid);
//     return order;
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Error creating order:", error);
//     throw error;
//   }
// }

// module.exports = {
//   db,
//   initializeDatabase,
//   createSampleUser,
//   createSampleOrder,
// };
