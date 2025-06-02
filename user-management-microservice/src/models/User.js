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
        validate: {
          isNumeric: false, // Allow + and spaces
          len: [10, 20],
        },
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
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        field: "date_of_birth",
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
      verificationToken: {
        type: DataTypes.STRING,
        field: "verification_token",
      },
      resetPasswordToken: {
        type: DataTypes.STRING,
        field: "reset_password_token",
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        field: "reset_password_expires",
      },
      lastLogin: {
        type: DataTypes.DATE,
        field: "last_login",
      },
      loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "login_attempts",
      },
      lockUntil: {
        type: DataTypes.DATE,
        field: "lock_until",
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
      businessLicense: {
        type: DataTypes.STRING,
        field: "business_license",
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
      currentLatitude: {
        type: DataTypes.DECIMAL(10, 8),
        field: "current_latitude",
      },
      currentLongitude: {
        type: DataTypes.DECIMAL(11, 8),
        field: "current_longitude",
      },

      // Developer specific fields
      companyName: {
        type: DataTypes.STRING,
        field: "company_name",
      },
      website: {
        type: DataTypes.STRING,
        validate: {
          isUrl: true,
        },
      },

      // Profile metadata
      profilePicture: {
        type: DataTypes.STRING,
        field: "profile_picture",
      },
      preferences: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
      notificationSettings: {
        type: DataTypes.JSON,
        defaultValue: {
          email: true,
          push: true,
          sms: false,
        },
        field: "notification_settings",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["email"] },
        { fields: ["user_type"] },
        { fields: ["is_active"] },
        { fields: ["uuid"] },
        { fields: ["verification_token"] },
        { fields: ["reset_password_token"] },
      ],
      scopes: {
        active: {
          where: {
            isActive: true,
          },
        },
        withoutPassword: {
          attributes: {
            exclude: [
              "passwordHash",
              "verificationToken",
              "resetPasswordToken",
            ],
          },
        },
      },
    }
  );

  // Instance Methods
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

  User.prototype.isDeveloper = function () {
    return this.userType === "developer";
  };

  User.prototype.isStaff = function () {
    return ["sales_dept", "tech_support"].includes(this.userType);
  };

  User.prototype.isAccountLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
  };

  User.prototype.toSafeJSON = function () {
    const user = this.toJSON();
    delete user.passwordHash;
    delete user.verificationToken;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpires;
    delete user.loginAttempts;
    delete user.lockUntil;
    return user;
  };

  return User;
};
