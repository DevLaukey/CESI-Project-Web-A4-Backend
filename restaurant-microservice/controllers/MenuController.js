const { Menu, Item, Restaurant, MenuItems, Category } = require("../models");
const { Op } = require("sequelize");
const {
  menuValidation,
  updateMenuValidation,
} = require("../validators/menuValidator");

class MenuController {
  // Create new menu
  static async createMenu(req, res, next) {
    const transaction = await Menu.sequelize.transaction();

    try {
      // Validate input
      const { error, value } = menuValidation.validate(req.body);
      if (error) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const { items, ...menuData } = value;

      // Get restaurant
      const restaurant = await Restaurant.findOne({
        where: { ownerId },
        transaction,
      });

      if (!restaurant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      // Validate items exist and belong to restaurant
      if (items && items.length > 0) {
        const itemIds = items.map((item) => item.itemId);
        const validItems = await Item.findAll({
          where: {
            id: itemIds,
            restaurantId: restaurant.id,
            isAvailable: true,
          },
          transaction,
        });

        if (validItems.length !== itemIds.length) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: "Invalid items",
            message: "Some items do not exist or are not available",
          });
        }
      }

      // Create menu
      const menu = await Menu.create(
        {
          restaurantId: restaurant.id,
          ...menuData,
        },
        { transaction }
      );

      // Add items to menu if provided
      if (items && items.length > 0) {
        const menuItemsData = items.map((item) => ({
          menuId: menu.id,
          itemId: item.itemId,
          quantity: item.quantity || 1,
          isOptional: item.isOptional || false,
          extraPrice: item.extraPrice || 0,
        }));

        await MenuItems.bulkCreate(menuItemsData, { transaction });
      }

      await transaction.commit();

      // Fetch complete menu with items
      const menuWithItems = await Menu.findByPk(menu.id, {
        include: [
          {
            model: Item,
            as: "items",
            through: {
              attributes: ["quantity", "isOptional", "extraPrice"],
            },
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["uuid", "name", "icon"],
              },
            ],
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "Menu created successfully",
        menu: menuWithItems,
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }

  // Get restaurant menus (owner view)
  static async getRestaurantMenus(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const {
        isAvailable,
        search,
        page = 1,
        limit = 20,
        sortBy = "sortOrder",
        sortOrder = "ASC",
      } = req.query;

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      // Build where clause
      const whereClause = { restaurantId: restaurant.id };

      if (isAvailable !== undefined) {
        whereClause.isAvailable = isAvailable === "true";
      }

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      // Validate sort parameters
      const validSortFields = [
        "name",
        "price",
        "sortOrder",

        "isPopular",
        "isFeatured",
      ];
      const validSortOrders = ["ASC", "DESC"];

      const actualSortBy = validSortFields.includes(sortBy)
        ? sortBy
        : "sortOrder";
      const actualSortOrder = validSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const { count, rows: menus } = await Menu.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Item,
            as: "items",
            through: {
              attributes: ["quantity", "isOptional", "extraPrice"],
            },
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["uuid", "name", "icon", "color"],
              },
            ],
          },
        ],
        order: [
          [actualSortBy, actualSortOrder],
        ],
        limit: Math.min(parseInt(limit), 50),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      // Calculate menu statistics
      const totalMenus = await Menu.count({
        where: { restaurantId: restaurant.id },
      });
      const availableMenus = await Menu.count({
        where: { restaurantId: restaurant.id, isAvailable: true },
      });
      const featuredMenus = await Menu.count({
        where: { restaurantId: restaurant.id, isFeatured: true },
      });

      res.json({
        success: true,
        menus,
        statistics: {
          total: totalMenus,
          available: availableMenus,
          featured: featuredMenus,
          unavailable: totalMenus - availableMenus,
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count,
          hasNextPage: parseInt(page) < Math.ceil(count / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit),
        },
        filters: {
          isAvailable,
          search,
          sortBy: actualSortBy,
          sortOrder: actualSortOrder,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single menu (owner view)
  static async getMenu(req, res, next) {
    try {
      const { menuUuid } = req.params;
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      const menu = await Menu.findOne({
        where: {
          uuid: menuUuid,
          restaurantId: restaurant.id,
        },
        include: [
          {
            model: Item,
            as: "items",
            through: {
              attributes: ["quantity", "isOptional", "extraPrice"],
            },
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["uuid", "name", "icon", "color"],
              },
            ],
          },
        ],
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
          message: "Menu not found in your restaurant",
        });
      }

      // Calculate menu nutritional info
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      menu.items.forEach((item) => {
        const quantity = item.MenuItems.quantity || 1;
        if (item.calories) totalCalories += item.calories * quantity;
        if (item.nutritionalInfo) {
          totalProtein += (item.nutritionalInfo.protein || 0) * quantity;
          totalCarbs += (item.nutritionalInfo.carbohydrates || 0) * quantity;
          totalFat += (item.nutritionalInfo.fat || 0) * quantity;
        }
      });

      const menuData = menu.toJSON();
      menuData.nutritionalSummary = {
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbohydrates: Math.round(totalCarbs * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
      };

      res.json({
        success: true,
        menu: menuData,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get public restaurant menus (customer view)
  static async getPublicRestaurantMenus(req, res, next) {
    try {
      const { restaurantUuid } = req.params;
      const {
        featured = false,
        popular = false,
        maxPrice,
        minPrice,
      } = req.query;

      // Find restaurant
      const restaurant = await Restaurant.findOne({
        where: { uuid: restaurantUuid, isActive: true },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "Restaurant not found or not active",
        });
      }

      // Build where clause
      const whereClause = {
        restaurantId: restaurant.id,
        isAvailable: true,
      };

      // Add filters
      if (featured === "true") whereClause.isFeatured = true;
      if (popular === "true") whereClause.isPopular = true;
      if (minPrice) whereClause.price = { [Op.gte]: parseFloat(minPrice) };
      if (maxPrice) {
        whereClause.price = whereClause.price
          ? { ...whereClause.price, [Op.lte]: parseFloat(maxPrice) }
          : { [Op.lte]: parseFloat(maxPrice) };
      }

      // Check if menu is valid (not expired)
      const now = new Date();
      whereClause[Op.or] = [
        { validFrom: null, validUntil: null },
        { validFrom: { [Op.lte]: now }, validUntil: null },
        { validFrom: null, validUntil: { [Op.gte]: now } },
        { validFrom: { [Op.lte]: now }, validUntil: { [Op.gte]: now } },
      ];

      const menus = await Menu.findAll({
        where: whereClause,
        include: [
          {
            model: Item,
            as: "items",
            where: { isAvailable: true },
            required: false,
            through: {
              attributes: ["quantity", "isOptional", "extraPrice"],
            },
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["uuid", "name", "icon", "color"],
              },
            ],
          },
        ],
        order: [
          ["isFeatured", "DESC"],
          ["isPopular", "DESC"],
          ["sortOrder", "ASC"],
          ["price", "ASC"],
        ],
      });

      res.json({
        success: true,
        menus,
        restaurant: {
          uuid: restaurant.uuid,
          name: restaurant.name,
          isOpen: restaurant.isOpen,
          isOpenNow: restaurant.isOpenNow(),
          deliveryFee: restaurant.deliveryFee,
          minimumOrder: restaurant.minimumOrder,
          averageDeliveryTime: restaurant.averageDeliveryTime,
        },
        filters: {
          featured: featured === "true",
          popular: popular === "true",
          priceRange: {
            min: minPrice ? parseFloat(minPrice) : null,
            max: maxPrice ? parseFloat(maxPrice) : null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update menu
  static async updateMenu(req, res, next) {
    const transaction = await Menu.sequelize.transaction();

    try {
      const { menuUuid } = req.params;
      const { error, value } = updateMenuValidation.validate(req.body);

      if (error) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const { items, ...menuData } = value;

      // Get restaurant and menu
      const restaurant = await Restaurant.findOne({
        where: { ownerId },
        transaction,
      });

      if (!restaurant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      const menu = await Menu.findOne({
        where: { uuid: menuUuid, restaurantId: restaurant.id },
        transaction,
      });

      if (!menu) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Menu not found",
          message: "Menu not found in your restaurant",
        });
      }

      // Update menu data
      await menu.update(menuData, { transaction });

      // Update menu items if provided
      if (items !== undefined) {
        // Remove existing menu items
        await MenuItems.destroy({
          where: { menuId: menu.id },
          transaction,
        });

        // Add new items if any
        if (items && items.length > 0) {
          // Validate items exist and belong to restaurant
          const itemIds = items.map((item) => item.itemId);
          const validItems = await Item.findAll({
            where: {
              id: itemIds,
              restaurantId: restaurant.id,
              isAvailable: true,
            },
            transaction,
          });

          if (validItems.length !== itemIds.length) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              error: "Invalid items",
              message: "Some items do not exist or are not available",
            });
          }

          const menuItemsData = items.map((item) => ({
            menuId: menu.id,
            itemId: item.itemId,
            quantity: item.quantity || 1,
            isOptional: item.isOptional || false,
            extraPrice: item.extraPrice || 0,
          }));

          await MenuItems.bulkCreate(menuItemsData, { transaction });
        }
      }

      await transaction.commit();

      // Fetch updated menu with items
      const updatedMenu = await Menu.findByPk(menu.id, {
        include: [
          {
            model: Item,
            as: "items",
            through: {
              attributes: ["quantity", "isOptional", "extraPrice"],
            },
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["uuid", "name", "icon", "color"],
              },
            ],
          },
        ],
      });

      res.json({
        success: true,
        message: "Menu updated successfully",
        menu: updatedMenu,
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }

  // Delete menu
  static async deleteMenu(req, res, next) {
    try {
      const { menuUuid } = req.params;
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      const menu = await Menu.findOne({
        where: { uuid: menuUuid, restaurantId: restaurant.id },
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
          message: "Menu not found in your restaurant",
        });
      }

      await menu.destroy();

      res.json({
        success: true,
        message: "Menu deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle menu availability
  static async toggleAvailability(req, res, next) {
    try {
      const { menuUuid } = req.params;
      const { isAvailable } = req.body;
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      const menu = await Menu.findOne({
        where: { uuid: menuUuid, restaurantId: restaurant.id },
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
        });
      }

      const newAvailability =
        typeof isAvailable === "boolean" ? isAvailable : !menu.isAvailable;
      await menu.update({ isAvailable: newAvailability });

      res.json({
        success: true,
        message: `Menu ${
          newAvailability ? "made available" : "made unavailable"
        }`,
        menu: {
          uuid: menu.uuid,
          name: menu.name,
          isAvailable: newAvailability,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Duplicate menu
  static async duplicateMenu(req, res, next) {
    const transaction = await Menu.sequelize.transaction();

    try {
      const { menuUuid } = req.params;
      const { name } = req.body;
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      if (!name || name.length < 2) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "New menu name is required",
        });
      }

      const restaurant = await Restaurant.findOne({
        where: { ownerId },
        transaction,
      });

      if (!restaurant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      // Get original menu with items
      const originalMenu = await Menu.findOne({
        where: { uuid: menuUuid, restaurantId: restaurant.id },
        include: [
          {
            model: Item,
            as: "items",
            through: {
              attributes: ["quantity", "isOptional", "extraPrice"],
            },
          },
        ],
        transaction,
      });

      if (!originalMenu) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Menu not found",
        });
      }

      // Create new menu
      const menuData = originalMenu.toJSON();
      delete menuData.id;
      delete menuData.uuid;
      delete menuData.updatedAt;
      delete menuData.items;

      menuData.name = name;
      menuData.isAvailable = false; // New menu starts as unavailable
      menuData.isFeatured = false;
      menuData.isPopular = false;

      const newMenu = await Menu.create(menuData, { transaction });

      // Copy menu items
      if (originalMenu.items && originalMenu.items.length > 0) {
        const menuItemsData = originalMenu.items.map((item) => ({
          menuId: newMenu.id,
          itemId: item.id,
          quantity: item.MenuItems.quantity,
          isOptional: item.MenuItems.isOptional,
          extraPrice: item.MenuItems.extraPrice,
        }));

        await MenuItems.bulkCreate(menuItemsData, { transaction });
      }

      await transaction.commit();

      // Fetch complete new menu
      const duplicatedMenu = await Menu.findByPk(newMenu.id, {
        include: [
          {
            model: Item,
            as: "items",
            through: {
              attributes: ["quantity", "isOptional", "extraPrice"],
            },
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["uuid", "name", "icon"],
              },
            ],
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "Menu duplicated successfully",
        menu: duplicatedMenu,
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }

  // Bulk update menu availability
  static async bulkUpdateAvailability(req, res, next) {
    const transaction = await Menu.sequelize.transaction();

    try {
      const { menuUuids, isAvailable } = req.body;
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      if (!Array.isArray(menuUuids) || menuUuids.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Menu UUIDs array is required",
        });
      }

      if (typeof isAvailable !== "boolean") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "isAvailable must be a boolean",
        });
      }

      const restaurant = await Restaurant.findOne({
        where: { ownerId },
        transaction,
      });

      if (!restaurant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      // Update menus
      const [updatedCount] = await Menu.update(
        { isAvailable },
        {
          where: {
            uuid: menuUuids,
            restaurantId: restaurant.id,
          },
          transaction,
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: `${updatedCount} menu(s) ${
          isAvailable ? "made available" : "made unavailable"
        }`,
        updatedCount,
        totalRequested: menuUuids.length,
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }

  // Get menu analytics
  static async getMenuAnalytics(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const { startDate, endDate, menuUuid } = req.query;

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      const whereClause = { restaurantId: restaurant.id };
      if (menuUuid) whereClause.uuid = menuUuid;

      const menus = await Menu.findAll({
        where: whereClause,
        attributes: [
          "uuid",
          "name",
          "price",
          "isAvailable",
          "isFeatured",
          "isPopular",
        ],
        include: [
          {
            model: Item,
            as: "items",
            attributes: ["name", "price"],
            through: {
              attributes: ["quantity", "extraPrice"],
            },
          },
        ],
      });

      // Calculate analytics
      const analytics = menus.map((menu) => {
        const totalItems = menu.items.length;
        const averageItemPrice =
          totalItems > 0
            ? menu.items.reduce(
                (sum, item) => sum + parseFloat(item.price),
                0
              ) / totalItems
            : 0;

        const menuItemsCost = menu.items.reduce((sum, item) => {
          return sum + parseFloat(item.price) * item.MenuItems.quantity;
        }, 0);

        const profitMargin =
          menuItemsCost > 0
            ? ((parseFloat(menu.price) - menuItemsCost) /
                parseFloat(menu.price)) *
              100
            : 0;

        return {
          uuid: menu.uuid,
          name: menu.name,
          price: parseFloat(menu.price),
          isAvailable: menu.isAvailable,
          isFeatured: menu.isFeatured,
          isPopular: menu.isPopular,
          totalItems,
          averageItemPrice: Math.round(averageItemPrice * 100) / 100,
          menuItemsCost: Math.round(menuItemsCost * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
        };
      });

      // Summary statistics
      const summary = {
        totalMenus: menus.length,
        availableMenus: menus.filter((m) => m.isAvailable).length,
        featuredMenus: menus.filter((m) => m.isFeatured).length,
        popularMenus: menus.filter((m) => m.isPopular).length,
        averageMenuPrice:
          analytics.length > 0
            ? analytics.reduce((sum, m) => sum + m.price, 0) / analytics.length
            : 0,
        averageProfitMargin:
          analytics.length > 0
            ? analytics.reduce((sum, m) => sum + m.profitMargin, 0) /
              analytics.length
            : 0,
      };

      res.json({
        success: true,
        analytics,
        summary: {
          ...summary,
          averageMenuPrice: Math.round(summary.averageMenuPrice * 100) / 100,
          averageProfitMargin:
            Math.round(summary.averageProfitMargin * 100) / 100,
        },
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MenuController;
