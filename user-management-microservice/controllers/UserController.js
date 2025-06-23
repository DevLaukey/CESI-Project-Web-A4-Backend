// controllers/UserController.js - Complete User Management Controller
const bcrypt = require("bcrypt");
const { User } = require("../models");
const {
  updateProfileValidation,
  changePasswordValidation,
  updateLocationValidation,
} = require("../validators/userValidator");

class UserController {
  // Get current user profile
  static async getProfile(req, res, next) {
    try {
      const user = req.user; // From auth middleware
      res.json({
        success: true,
        user: user.toSafeJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  static async updateProfile(req, res, next) {
    try {
      // Validate input
      const { error, value } = updateProfileValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const user = req.user;

      // Remove sensitive fields that shouldn't be updated via this endpoint
      const {
        email,
        passwordHash,
        userType,
        isActive,
        isVerified,
        verificationToken,
        resetPasswordToken,
        loginAttempts,
        lockUntil,
        id,
        uuid,
        createdAt,
        updatedAt,
        ...updateData
      } = value;

      // Update user
      await user.update(updateData);
      await user.reload(); // Refresh the instance

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: user.toSafeJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  static async changePassword(req, res, next) {
    try {
      // Validate input
      const { error, value } = changePasswordValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { currentPassword, newPassword } = value;
      const user = req.user;

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: "Invalid current password",
          message: "The current password you entered is incorrect",
        });
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(
        newPassword,
        user.passwordHash
      );
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          error: "Same password",
          message: "New password must be different from current password",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      await user.update({ passwordHash });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Update driver location (for delivery drivers)
  static async updateLocation(req, res, next) {
    try {
      const user = req.user;

      if (!user.isDeliveryDriver()) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "Only delivery drivers can update location",
        });
      }

      // Validate input
      const { error, value } = updateLocationValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { latitude, longitude, isAvailable } = value;

      await user.update({
        currentLatitude: latitude,
        currentLongitude: longitude,
        isAvailable: isAvailable !== undefined ? isAvailable : user.isAvailable,
      });

      res.json({
        success: true,
        message: "Location updated successfully",
        location: {
          latitude: user.currentLatitude,
          longitude: user.currentLongitude,
          isAvailable: user.isAvailable,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update driver availability
  static async updateAvailability(req, res, next) {
    try {
      const user = req.user;

      if (!user.isDeliveryDriver()) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "Only delivery drivers can update availability",
        });
      }

      const { isAvailable } = req.body;

      if (typeof isAvailable !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "isAvailable must be a boolean value",
        });
      }

      await user.update({ isAvailable });

      res.json({
        success: true,
        message: `Driver ${
          isAvailable ? "available" : "unavailable"
        } for deliveries`,
        isAvailable: user.isAvailable,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update notification settings
  static async updateNotificationSettings(req, res, next) {
    try {
      const user = req.user;
      const { notificationSettings } = req.body;

      if (!notificationSettings || typeof notificationSettings !== "object") {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "notificationSettings must be an object",
        });
      }

      // Merge with existing settings
      const currentSettings = user.notificationSettings || {};
      const updatedSettings = { ...currentSettings, ...notificationSettings };

      await user.update({ notificationSettings: updatedSettings });

      res.json({
        success: true,
        message: "Notification settings updated successfully",
        notificationSettings: updatedSettings,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user by UUID (for other services)
  static async getUserById(req, res, next) {
    try {
      const { uuid } = req.params;

      const user = await User.scope("withoutPassword").findOne({
        where: { uuid, isActive: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: "No active user found with the provided ID",
        });
      }

      res.json({
        success: true,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get multiple users by UUIDs (for other services)
  static async getUsersByIds(req, res, next) {
    try {
      const { uuids } = req.body;

      if (!Array.isArray(uuids) || uuids.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "uuids must be a non-empty array",
        });
      }

      if (uuids.length > 100) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Maximum 100 UUIDs allowed per request",
        });
      }

      const users = await User.scope("withoutPassword").findAll({
        where: {
          uuid: uuids,
          isActive: true,
        },
      });

      res.json({
        success: true,
        users: users.map((user) => user.toJSON()),
        found: users.length,
        requested: uuids.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get users by type (for other services)
  static async getUsersByType(req, res, next) {
    try {
      const { userType } = req.params;
      const {
        page = 1,
        limit = 20,
        isAvailable,
        city,
        isVerified,
        search,
      } = req.query;

      const validUserTypes = [
        "end_user",
        "restaurant_owner",
        "delivery_driver",
        "developer",
        "sales_dept",
        "tech_support",
      ];
      if (!validUserTypes.includes(userType)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user type",
          message: `User type must be one of: ${validUserTypes.join(", ")}`,
        });
      }

      // Build where clause
      const whereClause = {
        userType,
        isActive: true,
      };

      // For delivery drivers, filter by availability if specified
      if (userType === "delivery_driver" && isAvailable !== undefined) {
        whereClause.isAvailable = isAvailable === "true";
      }

      // Filter by city if specified
      if (city) {
        whereClause.city = city;
      }

      // Filter by verification status if specified
      if (isVerified !== undefined) {
        whereClause.isVerified = isVerified === "true";
      }

      // Search filter
      if (search) {
        const { Op } = require("sequelize");
        whereClause[Op.or] = [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];

        if (userType === "restaurant_owner") {
          whereClause[Op.or].push({
            restaurantName: { [Op.like]: `%${search}%` },
          });
        }
      }

      const { count, rows: users } = await User.scope(
        "withoutPassword"
      ).findAndCountAll({
        where: whereClause,
        limit: Math.min(parseInt(limit), 100), // Max 100 per request
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      res.json({
        success: true,
        users: users.map((user) => user.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count,
          hasNextPage: parseInt(page) < Math.ceil(count / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get available delivery drivers (for order service)
  static async getAvailableDrivers(req, res, next) {
    try {
      const {
        latitude,
        longitude,
        radius = 10, // km
        limit = 20,
      } = req.query;

      const whereClause = {
        userType: "delivery_driver",
        isActive: true,
        isAvailable: true,
        currentLatitude: { [require("sequelize").Op.ne]: null },
        currentLongitude: { [require("sequelize").Op.ne]: null },
      };

      let drivers;

      if (latitude && longitude) {
        // Use Haversine formula to find drivers within radius
        const { Op } = require("sequelize");
        drivers = await User.scope("withoutPassword").findAll({
          where: whereClause,
          attributes: {
            include: [
              [
                require("sequelize").literal(`
                  (6371 * acos(cos(radians(${latitude})) 
                  * cos(radians(current_latitude)) 
                  * cos(radians(current_longitude) - radians(${longitude})) 
                  + sin(radians(${latitude})) 
                  * sin(radians(current_latitude))))
                `),
                "distance",
              ],
            ],
          },
          having: require("sequelize").literal(`distance <= ${radius}`),
          order: [["distance", "ASC"]],
          limit: parseInt(limit),
        });
      } else {
        // Just get available drivers without location filtering
        drivers = await User.scope("withoutPassword").findAll({
          where: whereClause,
          limit: parseInt(limit),
          order: [["lastLogin", "DESC"]],
        });
      }

      res.json({
        success: true,
        drivers: drivers.map((driver) => ({
          ...driver.toJSON(),
          distance: driver.dataValues.distance || null,
        })),
        count: drivers.length,
        searchCriteria: {
          latitude: latitude || null,
          longitude: longitude || null,
          radius: parseFloat(radius),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user statistics (for analytics)
  static async getUserStats(req, res, next) {
    try {
      const { userType } = req.params;
      const { startDate, endDate } = req.query;

      const validUserTypes = [
        "end_user",
        "restaurant_owner",
        "delivery_driver",
        "developer",
        "sales_dept",
        "tech_support",
      ];
      if (userType && !validUserTypes.includes(userType)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user type",
          message: `User type must be one of: ${validUserTypes.join(", ")}`,
        });
      }

      let whereClause = { isActive: true };
      if (userType) {
        whereClause.userType = userType;
      }

      if (startDate && endDate) {
        whereClause.createdAt = {
          [require("sequelize").Op.between]: [
            new Date(startDate),
            new Date(endDate),
          ],
        };
      }

      const [totalUsers, verifiedUsers, byType, byCity] = await Promise.all([
        // Total users
        User.count({ where: whereClause }),

        // Verified users
        User.count({ where: { ...whereClause, isVerified: true } }),

        // Users by type
        User.findAll({
          attributes: [
            "userType",
            [
              require("sequelize").fn("COUNT", require("sequelize").col("id")),
              "count",
            ],
          ],
          where: whereClause,
          group: ["userType"],
        }),

        // Users by city (top 10)
        User.findAll({
          attributes: [
            "city",
            [
              require("sequelize").fn("COUNT", require("sequelize").col("id")),
              "count",
            ],
          ],
          where: {
            ...whereClause,
            city: { [require("sequelize").Op.ne]: null },
          },
          group: ["city"],
          order: [
            [
              require("sequelize").fn("COUNT", require("sequelize").col("id")),
              "DESC",
            ],
          ],
          limit: 10,
        }),
      ]);

      res.json({
        success: true,
        statistics: {
          totalUsers,
          verifiedUsers,
          verificationRate:
            totalUsers > 0
              ? ((verifiedUsers / totalUsers) * 100).toFixed(2)
              : 0,
          byUserType: byType.map((item) => ({
            userType: item.userType,
            count: parseInt(item.dataValues.count),
          })),
          topCities: byCity.map((item) => ({
            city: item.city,
            count: parseInt(item.dataValues.count),
          })),
        },
        filters: {
          userType: userType || "all",
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Deactivate account (soft delete)
  static async deactivateAccount(req, res, next) {
    try {
      const user = req.user;
      const { reason } = req.body;

      await user.update({
        isActive: false,
        isAvailable: false, // For drivers
        deactivatedAt: new Date(),
        deactivationReason: reason || "User requested",
      });

      res.json({
        success: true,
        message: "Account deactivated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Reactivate account (admin only)
  static async reactivateAccount(req, res, next) {
    try {
      const { uuid } = req.params;
      const currentUser = req.user;

      // Check if current user is admin/staff
      if (!currentUser.isStaff()) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "Only staff members can reactivate accounts",
        });
      }

      const user = await User.findOne({ where: { uuid } });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: "No user found with the provided ID",
        });
      }

      await user.update({
        isActive: true,
        deactivatedAt: null,
        deactivationReason: null,
        reactivatedAt: new Date(),
        reactivatedBy: currentUser.id,
      });

      res.json({
        success: true,
        message: "Account reactivated successfully",
        user: user.toSafeJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload profile picture
  static async uploadProfilePicture(req, res, next) {
    try {
      const user = req.user;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
          message: "Please select a profile picture to upload",
        });
      }

      // In a real implementation, you would save the file to cloud storage
      // For now, we'll just save the filename
      const profilePicture = `/uploads/profiles/${req.file.filename}`;

      await user.update({ profilePicture });

      res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        profilePicture,
      });
    } catch (error) {
      next(error);
    }
  }

  // Search users (admin only)
  static async searchUsers(req, res, next) {
    try {
      const currentUser = req.user;

      if (!currentUser.isStaff()) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "Only staff members can search users",
        });
      }

      const {
        query,
        userType,
        isActive,
        isVerified,
        page = 1,
        limit = 20,
      } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Search query must be at least 2 characters long",
        });
      }

      const { Op } = require("sequelize");
      const whereClause = {
        [Op.or]: [
          { firstName: { [Op.like]: `%${query}%` } },
          { lastName: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } },
          { phone: { [Op.like]: `%${query}%` } },
        ],
      };

      if (userType) whereClause.userType = userType;
      if (isActive !== undefined) whereClause.isActive = isActive === "true";
      if (isVerified !== undefined)
        whereClause.isVerified = isVerified === "true";

      const { count, rows: users } = await User.scope(
        "withoutPassword"
      ).findAndCountAll({
        where: whereClause,
        limit: Math.min(parseInt(limit), 50),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      res.json({
        success: true,
        users: users.map((user) => user.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count,
        },
        searchQuery: query,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
