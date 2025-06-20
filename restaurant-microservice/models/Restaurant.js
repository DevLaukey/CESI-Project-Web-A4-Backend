module.exports = (sequelize, DataTypes) => {
  const Restaurant = sequelize.define(
    "Restaurant",
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
      ownerId: {
        type: DataTypes.STRING, // UUID from User microservice
        allowNull: false,
        field: "owner_id",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      cuisineType: {
        type: DataTypes.STRING(100),
        field: "cuisine_type",
      },
      phone: {
        type: DataTypes.STRING(20),
      },
      email: {
        type: DataTypes.STRING,
        validate: {
          isEmail: true,
        },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      postalCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: "postal_code",
      },
      country: {
        type: DataTypes.STRING(100),
        defaultValue: "France",
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
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
      isOpen: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_open",
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0.0,
        validate: {
          min: 0,
          max: 5,
        },
      },
      reviewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "review_count",
      },
      deliveryFee: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        field: "delivery_fee",
      },
      minimumOrder: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        field: "minimum_order",
      },
      averageDeliveryTime: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        field: "average_delivery_time",
      },
      openingHours: {
        type: DataTypes.JSON,
        defaultValue: {},
        field: "opening_hours",
      },
      profileImage: {
        type: DataTypes.STRING,
        field: "profile_image",
      },
      bannerImage: {
        type: DataTypes.STRING,
        field: "banner_image",
      },
      tags: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      businessLicense: {
        type: DataTypes.STRING,
        field: "business_license",
      },
      settings: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
    },
    {
      tableName: "restaurants",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["owner_id"] },
        { fields: ["cuisine_type"] },
        { fields: ["city"] },
        { fields: ["is_active"] },
        { fields: ["is_open"] },
        { fields: ["rating"] },
        { fields: ["latitude", "longitude"] },
      ],
    }
  );

  // Define associations
  Restaurant.associate = function (models) {
    Restaurant.hasMany(models.Item, {
      foreignKey: "restaurantId",
      as: "items",
    });
    Restaurant.hasMany(models.Menu, {
      foreignKey: "restaurantId",
      as: "menus",
    });
    Restaurant.hasMany(models.RestaurantStats, {
      foreignKey: "restaurantId",
      as: "stats",
    });
    Restaurant.hasMany(models.Review, {
      foreignKey: "restaurantId",
      as: "reviews",
    });
    Restaurant.belongsToMany(models.Category, {
      through: models.RestaurantCategories, // Fixed: use the actual model
      foreignKey: "restaurantId",
      otherKey: "categoryId",
      as: "categories",
    });
  };

  // Instance methods
  Restaurant.prototype.toSafeJSON = function () {
    const restaurant = this.toJSON();
    delete restaurant.businessLicense;
    return restaurant;
  };

  Restaurant.prototype.isOpenNow = function () {
    if (!this.isOpen || !this.isActive) return false;

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

    const openingHours = this.openingHours || {};
    const todayHours = openingHours[dayOfWeek];

    if (!todayHours || !todayHours.open || !todayHours.close) return false;

    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  };

  Restaurant.prototype.calculateDistance = function (lat, lng) {
    if (!this.latitude || !this.longitude) return null;

    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat - this.latitude) * Math.PI) / 180;
    const dLng = ((lng - this.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((this.latitude * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return Restaurant;
};
