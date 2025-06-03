module.exports = (sequelize, DataTypes) => {
    const RestaurantStats = sequelize.define('RestaurantStats', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false
      },
      restaurantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'restaurant_id'
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      
      // Order Statistics
      totalOrders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'total_orders',
        validate: {
          min: 0
        }
      },
      completedOrders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'completed_orders',
        validate: {
          min: 0
        }
      },
      cancelledOrders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'cancelled_orders',
        validate: {
          min: 0
        }
      },
      refundedOrders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'refunded_orders',
        validate: {
          min: 0
        }
      },
      
      // Revenue Statistics
      totalRevenue: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        field: 'total_revenue',
        validate: {
          min: 0
        }
      },
      netRevenue: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        field: 'net_revenue',
        validate: {
          min: 0
        }
      },
      averageOrderValue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        field: 'average_order_value',
        validate: {
          min: 0
        }
      },
      deliveryFeeRevenue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        field: 'delivery_fee_revenue',
        validate: {
          min: 0
        }
      },
      taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        field: 'tax_amount',
        validate: {
          min: 0
        }
      },
      
      // Performance Statistics
      averagePreparationTime: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'average_preparation_time',
        validate: {
          min: 0
        }
      },
      averageDeliveryTime: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'average_delivery_time',
        validate: {
          min: 0
        }
      },
      onTimeDeliveries: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'on_time_deliveries',
        validate: {
          min: 0
        }
      },
      lateDeliveries: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'late_deliveries',
        validate: {
          min: 0
        }
      },
      
      // Item Statistics
      itemsSold: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'items_sold',
        validate: {
          min: 0
        }
      },
      uniqueItemsSold: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'unique_items_sold',
        validate: {
          min: 0
        }
      },
      topSellingItemId: {
        type: DataTypes.INTEGER,
        field: 'top_selling_item_id'
      },
      menusSold: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'menus_sold',
        validate: {
          min: 0
        }
      },
      
      // Customer Statistics
      totalCustomers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'total_customers',
        validate: {
          min: 0
        }
      },
      newCustomers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'new_customers',
        validate: {
          min: 0
        }
      },
      returningCustomers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'returning_customers',
        validate: {
          min: 0
        }
      },
      customerRetentionRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        field: 'customer_retention_rate',
        validate: {
          min: 0,
          max: 100
        }
      },
      
      // Rating and Review Statistics
      averageRating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0.00,
        field: 'average_rating',
        validate: {
          min: 0,
          max: 5
        }
      },
      totalReviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'total_reviews',
        validate: {
          min: 0
        }
      },
      positiveReviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'positive_reviews',
        validate: {
          min: 0
        }
      },
      negativeReviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'negative_reviews',
        validate: {
          min: 0
        }
      },
      
      // Operational Statistics
      hoursOpen: {
        type: DataTypes.DECIMAL(4, 2),
        defaultValue: 0.00,
        field: 'hours_open',
        validate: {
          min: 0,
          max: 24
        }
      },
      peakHourOrders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'peak_hour_orders',
        validate: {
          min: 0
        }
      },
      peakHour: {
        type: DataTypes.INTEGER,
        field: 'peak_hour',
        validate: {
          min: 0,
          max: 23
        }
      },
      orderCancellationRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        field: 'order_cancellation_rate',
        validate: {
          min: 0,
          max: 100
        }
      },
      
      // Additional Metrics
      viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'view_count',
        validate: {
          min: 0
        }
      },
      conversionRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        field: 'conversion_rate',
        validate: {
          min: 0,
          max: 100
        }
      },
      averageItemsPerOrder: {
        type: DataTypes.DECIMAL(4, 2),
        defaultValue: 0.00,
        field: 'average_items_per_order',
        validate: {
          min: 0
        }
      },
      
      // Metadata
      lastCalculated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'last_calculated'
      },
      dataSource: {
        type: DataTypes.ENUM('manual', 'automated', 'imported'),
        defaultValue: 'automated',
        field: 'data_source'
      },
      notes: {
        type: DataTypes.TEXT
      }
    }, {
      tableName: 'restaurant_stats',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['restaurant_id'] },
        { fields: ['date'] },
        { fields: ['restaurant_id', 'date'], unique: true },
        { fields: ['total_revenue'] },
        { fields: ['total_orders'] },
        { fields: ['average_rating'] },
        { fields: ['last_calculated'] }
      ],
      hooks: {
        beforeValidate: (stats) => {
          // Calculate derived fields
          if (stats.totalOrders > 0) {
            stats.orderCancellationRate = (stats.cancelledOrders / stats.totalOrders) * 100;
          }
          
          if (stats.totalRevenue > 0 && stats.completedOrders > 0) {
            stats.averageOrderValue = stats.totalRevenue / stats.completedOrders;
          }
          
          if (stats.totalCustomers > 0) {
            stats.customerRetentionRate = (stats.returningCustomers / stats.totalCustomers) * 100;
          }
          
          if (stats.viewCount > 0) {
            stats.conversionRate = (stats.totalOrders / stats.viewCount) * 100;
          }
          
          if (stats.totalOrders > 0) {
            stats.averageItemsPerOrder = stats.itemsSold / stats.totalOrders;
          }
        }
      }
    });
  
    RestaurantStats.associate = function(models) {
      RestaurantStats.belongsTo(models.Restaurant, { 
        foreignKey: 'restaurantId', 
        as: 'restaurant' 
      });
      
      if (models.Item) {
        RestaurantStats.belongsTo(models.Item, { 
          foreignKey: 'topSellingItemId', 
          as: 'topSellingItem' 
        });
      }
    };
  
    // Instance methods
    RestaurantStats.prototype.getCompletionRate = function() {
      if (this.totalOrders === 0) return 0;
      return ((this.completedOrders / this.totalOrders) * 100).toFixed(2);
    };
  
    RestaurantStats.prototype.getSuccessRate = function() {
      if (this.totalOrders === 0) return 0;
      const successfulOrders = this.totalOrders - this.cancelledOrders - this.refundedOrders;
      return ((successfulOrders / this.totalOrders) * 100).toFixed(2);
    };
  
    RestaurantStats.prototype.getOnTimeDeliveryRate = function() {
      const totalDeliveries = this.onTimeDeliveries + this.lateDeliveries;
      if (totalDeliveries === 0) return 0;
      return ((this.onTimeDeliveries / totalDeliveries) * 100).toFixed(2);
    };
  
    RestaurantStats.prototype.getPositiveReviewRate = function() {
      if (this.totalReviews === 0) return 0;
      return ((this.positiveReviews / this.totalReviews) * 100).toFixed(2);
    };
  
    // Static methods
    RestaurantStats.getDateRange = function(startDate, endDate) {
      const dates = [];
      const currentDate = new Date(startDate);
      const finalDate = new Date(endDate);
      
      while (currentDate <= finalDate) {
        dates.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return dates;
    };
  
    RestaurantStats.calculateAggregates = function(statsArray) {
      if (!statsArray || statsArray.length === 0) {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          averageRating: 0,
          completionRate: 0,
          cancellationRate: 0
        };
      }
  
      const totals = statsArray.reduce((acc, stat) => {
        acc.totalOrders += stat.totalOrders || 0;
        acc.completedOrders += stat.completedOrders || 0;
        acc.cancelledOrders += stat.cancelledOrders || 0;
        acc.totalRevenue += parseFloat(stat.totalRevenue || 0);
        acc.totalReviews += stat.totalReviews || 0;
        acc.ratingSum += (stat.averageRating || 0) * (stat.totalReviews || 0);
        acc.itemsSold += stat.itemsSold || 0;
        acc.totalCustomers += stat.totalCustomers || 0;
        return acc;
      }, {
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        totalReviews: 0,
        ratingSum: 0,
        itemsSold: 0,
        totalCustomers: 0
      });
  
      return {
        totalOrders: totals.totalOrders,
        completedOrders: totals.completedOrders,
        cancelledOrders: totals.cancelledOrders,
        totalRevenue: Math.round(totals.totalRevenue * 100) / 100,
        averageOrderValue: totals.completedOrders > 0 
          ? Math.round((totals.totalRevenue / totals.completedOrders) * 100) / 100 
          : 0,
        averageRating: totals.totalReviews > 0 
          ? Math.round((totals.ratingSum / totals.totalReviews) * 100) / 100 
          : 0,
        completionRate: totals.totalOrders > 0 
          ? Math.round((totals.completedOrders / totals.totalOrders) * 100 * 100) / 100 
          : 0,
        cancellationRate: totals.totalOrders > 0 
          ? Math.round((totals.cancelledOrders / totals.totalOrders) * 100 * 100) / 100 
          : 0,
        itemsSold: totals.itemsSold,
        totalCustomers: totals.totalCustomers,
        averageItemsPerOrder: totals.totalOrders > 0 
          ? Math.round((totals.itemsSold / totals.totalOrders) * 100) / 100 
          : 0
      };
    };
  
    return RestaurantStats;
  };
  
