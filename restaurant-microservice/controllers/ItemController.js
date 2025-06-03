const { Item, Restaurant, Category } = require('../models');
const { Op } = require('sequelize');
const { itemValidation, updateItemValidation } = require('../validators/itemValidator');

class ItemController {
  // Create new item
  static async createItem(req, res, next) {
    try {
      const { error, value } = itemValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.details.map(detail => detail.message)
        });
      }

      const ownerId = req.user?.uuid || req.headers['x-user-id'];
      
      // Get restaurant
      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
          message: 'No restaurant found for your account'
        });
      }

      const item = await Item.create({
        restaurantId: restaurant.id,
        ...value
      });

      const itemWithCategory = await Item.findByPk(item.id, {
        include: [{ model: Category, as: 'category' }]
      });

      res.status(201).json({
        success: true,
        message: 'Item created successfully',
        item: itemWithCategory
      });

    } catch (error) {
      next(error);
    }
  }

  // Get restaurant items
  static async getRestaurantItems(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers['x-user-id'];
      const { categoryId, isAvailable, search, page = 1, limit = 50 } = req.query;

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      const whereClause = { restaurantId: restaurant.id };

      if (categoryId) whereClause.categoryId = categoryId;
      if (isAvailable !== undefined) whereClause.isAvailable = isAvailable === 'true';
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows: items } = await Item.findAndCountAll({
        where: whereClause,
        include: [{ model: Category, as: 'category' }],
        order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get public restaurant items (for customers)
  static async getPublicRestaurantItems(req, res, next) {
    try {
      const { restaurantUuid } = req.params;
      const { categoryId, page = 1, limit = 50 } = req.query;

      const restaurant = await Restaurant.findOne({
        where: { uuid: restaurantUuid, isActive: true }
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      const whereClause = {
        restaurantId: restaurant.id,
        isAvailable: true
      };

      if (categoryId) whereClause.categoryId = categoryId;

      const { count, rows: items } = await Item.findAndCountAll({
        where: whereClause,
        include: [{ model: Category, as: 'category' }],
        order: [
          ['isFeatured', 'DESC'],
          ['isPopular', 'DESC'],
          ['sortOrder', 'ASC'],
          ['rating', 'DESC']
        ],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        items,
        restaurant: {
          uuid: restaurant.uuid,
          name: restaurant.name,
          isOpen: restaurant.isOpen
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Update item
  static async updateItem(req, res, next) {
    try {
      const { itemUuid } = req.params;
      const { error, value } = updateItemValidation.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.details.map(detail => detail.message)
        });
      }

      const ownerId = req.user?.uuid || req.headers['x-user-id'];
      
      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      const item = await Item.findOne({
        where: { uuid: itemUuid, restaurantId: restaurant.id }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      await item.update(value);

      const updatedItem = await Item.findByPk(item.id, {
        include: [{ model: Category, as: 'category' }]
      });

      res.json({
        success: true,
        message: 'Item updated successfully',
        item: updatedItem
      });

    } catch (error) {
      next(error);
    }
  }

  // Delete item
  static async deleteItem(req, res, next) {
    try {
      const { itemUuid } = req.params;
      const ownerId = req.user?.uuid || req.headers['x-user-id'];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      const item = await Item.findOne({
        where: { uuid: itemUuid, restaurantId: restaurant.id }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      await item.destroy();

      res.json({
        success: true,
        message: 'Item deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Toggle item availability
  static async toggleAvailability(req, res, next) {
    try {
      const { itemUuid } = req.params;
      const ownerId = req.user?.uuid || req.headers['x-user-id'];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      const item = await Item.findOne({
        where: { uuid: itemUuid, restaurantId: restaurant.id }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      await item.update({ isAvailable: !item.isAvailable });

      res.json({
        success: true,
        message: `Item ${item.isAvailable ? 'made available' : 'made unavailable'}`,
        item: {
          uuid: item.uuid,
          name: item.name,
          isAvailable: item.isAvailable
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get popular items
  static async getPopularItems(req, res, next) {
    try {
      const { restaurantUuid, limit = 10 } = req.query;

      const whereClause = {
        isAvailable: true,
        isPopular: true
      };

      if (restaurantUuid) {
        const restaurant = await Restaurant.findOne({
          where: { uuid: restaurantUuid, isActive: true }
        });
        if (restaurant) {
          whereClause.restaurantId = restaurant.id;
        }
      }

      const items = await Item.findAll({
        where: whereClause,
        include: [
          { model: Category, as: 'category' },
          { model: Restaurant, as: 'restaurant', attributes: ['uuid', 'name', 'rating'] }
        ],
        order: [['orderCount', 'DESC'], ['rating', 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        items
      });

    } catch (error) {
      next(error);
    }
  }

  // Search items across all restaurants
  static async searchItems(req, res, next) {
    try {
      const { q, city, categoryId, page = 1, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters'
        });
      }

      const itemWhereClause = {
        isAvailable: true,
        [Op.or] : [
          { name: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } }
        ]
      };

      if (categoryId) itemWhereClause.categoryId = categoryId;

      const restaurantWhereClause = {
        isActive: true,
        isOpen: true
      };

      if (city) restaurantWhereClause.city = city;

      const { count, rows: items } = await Item.findAndCountAll({
        where: itemWhereClause,
        include: [
          {
            model: Restaurant,
            as: 'restaurant',
            where: restaurantWhereClause,
            attributes: ['uuid', 'name', 'city', 'rating', 'deliveryFee', 'averageDeliveryTime']
          },
          { model: Category, as: 'category' }
        ],
        order: [['rating', 'DESC'], ['orderCount', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count
        },
        searchQuery: q
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = ItemController;