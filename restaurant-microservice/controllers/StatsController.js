const { RestaurantStats, Restaurant, Item } = require("../models");
const { Op } = require("sequelize");

class StatsController {
  // Get restaurant statistics for owner
  static async getRestaurantStats(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const {
        startDate,
        endDate,
        period = "daily",
        compare = false,
      } = req.query;

      // Get restaurant
      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      // Set date range (default to last 30 days)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get statistics
      const whereClause = {
        restaurantId: restaurant.id,
        date: {
          [Op.between]: [start, end],
        },
      };

      const stats = await RestaurantStats.findAll({
        where: whereClause,
        include: [
          {
            model: Item,
            as: "topSellingItem",
            attributes: ["uuid", "name", "price"],
            required: false,
          },
        ],
        order: [["date", "ASC"]],
      });

      // Calculate aggregates
      const aggregates = RestaurantStats.calculateAggregates(stats);

      // Group by period if requested
      let groupedStats = stats;
      if (period === "weekly") {
        groupedStats = groupStatsByWeek(stats);
      } else if (period === "monthly") {
        groupedStats = groupStatsByMonth(stats);
      }

      // Get comparison data if requested
      let comparison = null;
      if (compare === "true") {
        const compareStart = new Date(
          start.getTime() - (end.getTime() - start.getTime())
        );
        const compareEnd = new Date(start.getTime() - 1);

        const compareStats = await RestaurantStats.findAll({
          where: {
            restaurantId: restaurant.id,
            date: {
              [Op.between]: [compareStart, compareEnd],
            },
          },
        });

        const compareAggregates =
          RestaurantStats.calculateAggregates(compareStats);
        comparison = calculateGrowthRates(aggregates, compareAggregates);
      }

      // Get current day stats
      const today = new Date().toISOString().split("T")[0];
      const todayStats = await RestaurantStats.findOne({
        where: {
          restaurantId: restaurant.id,
          date: today,
        },
      });

      res.json({
        success: true,
        statistics: {
          period: {
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0],
            totalDays: stats.length,
          },
          aggregates,
          daily: groupedStats,
          today: todayStats || null,
          comparison,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Create or update daily statistics
  static async updateDailyStats(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const { date = new Date().toISOString().split("T")[0], ...statsData } =
        req.body;

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      // Upsert statistics
      const [stats, created] = await RestaurantStats.upsert(
        {
          restaurantId: restaurant.id,
          date,
          ...statsData,
          lastCalculated: new Date(),
        },
        {
          returning: true,
        }
      );

      res.json({
        success: true,
        message: created
          ? "Statistics created successfully"
          : "Statistics updated successfully",
        statistics: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get statistics summary for dashboard
  static async getStatsSummary(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      // Get last 7 days stats
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentStats = await RestaurantStats.findAll({
        where: {
          restaurantId: restaurant.id,
          date: {
            [Op.gte]: sevenDaysAgo,
          },
        },
        order: [["date", "DESC"]],
      });

      // Get today's stats
      const today = new Date().toISOString().split("T")[0];
      const todayStats = recentStats.find((stat) => stat.date === today);

      // Calculate trends
      const trends = calculateTrends(recentStats);

      // Get best performing day in the last 7 days
      const bestDay = recentStats.reduce((best, current) => {
        return current.totalRevenue > (best?.totalRevenue || 0)
          ? current
          : best;
      }, null);

      res.json({
        success: true,
        summary: {
          today: todayStats
            ? {
                orders: todayStats.totalOrders,
                revenue: parseFloat(todayStats.totalRevenue),
                averageOrderValue: parseFloat(todayStats.averageOrderValue),
                rating: parseFloat(todayStats.averageRating),
              }
            : null,
          trends,
          bestDay: bestDay
            ? {
                date: bestDay.date,
                orders: bestDay.totalOrders,
                revenue: parseFloat(bestDay.totalRevenue),
              }
            : null,
          weeklyAggregate: RestaurantStats.calculateAggregates(recentStats),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Generate statistics report
  static async generateReport(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const {
        startDate,
        endDate,
        format = "json",
        includeCharts = false,
      } = req.query;

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      // Set date range
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = await RestaurantStats.findAll({
        where: {
          restaurantId: restaurant.id,
          date: {
            [Op.between]: [start, end],
          },
        },
        include: [
          {
            model: Item,
            as: "topSellingItem",
            attributes: ["uuid", "name", "price"],
            required: false,
          },
        ],
        order: [["date", "ASC"]],
      });

      const report = {
        restaurant: {
          name: restaurant.name,
          uuid: restaurant.uuid,
        },
        period: {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
          totalDays: stats.length,
        },
        summary: RestaurantStats.calculateAggregates(stats),
        dailyStats: stats.map((stat) => ({
          date: stat.date,
          orders: stat.totalOrders,
          revenue: parseFloat(stat.totalRevenue),
          averageOrderValue: parseFloat(stat.averageOrderValue),
          rating: parseFloat(stat.averageRating),
          completionRate: stat.getCompletionRate(),
          onTimeDeliveryRate: stat.getOnTimeDeliveryRate(),
        })),
        insights: generateInsights(stats),
        generatedAt: new Date().toISOString(),
      };

      if (includeCharts === "true") {
        report.chartData = generateChartData(stats);
      }

      res.json({
        success: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  }

  // Compare with other restaurants (anonymized)
  static async getIndustryBenchmarks(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      // Get last 30 days stats for this restaurant
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const myStats = await RestaurantStats.findAll({
        where: {
          restaurantId: restaurant.id,
          date: {
            [Op.gte]: thirtyDaysAgo,
          },
        },
      });

      const myAggregates = RestaurantStats.calculateAggregates(myStats);

      // Get industry benchmarks (same cuisine type and city)
      const industryStats = await sequelize.query(
        `
          SELECT 
            AVG(rs.average_order_value) as avgOrderValue,
            AVG(rs.average_rating) as avgRating,
            AVG(rs.order_cancellation_rate) as avgCancellationRate,
            AVG(rs.customer_retention_rate) as avgRetentionRate,
            COUNT(DISTINCT rs.restaurant_id) as restaurantCount
          FROM restaurant_stats rs
          JOIN restaurants r ON rs.restaurant_id = r.id
          WHERE r.cuisine_type = :cuisineType 
          AND r.city = :city 
          AND r.id != :restaurantId
          AND rs.date >= :startDate
        `,
        {
          replacements: {
            cuisineType: restaurant.cuisineType,
            city: restaurant.city,
            restaurantId: restaurant.id,
            startDate: thirtyDaysAgo,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      const benchmarks = industryStats[0];

      res.json({
        success: true,
        benchmarks: {
          myPerformance: {
            averageOrderValue: myAggregates.averageOrderValue,
            averageRating: myAggregates.averageRating,
            cancellationRate: myAggregates.cancellationRate,
            // Add more metrics as needed
          },
          industryAverage: {
            averageOrderValue: parseFloat(benchmarks.avgOrderValue || 0),
            averageRating: parseFloat(benchmarks.avgRating || 0),
            cancellationRate: parseFloat(benchmarks.avgCancellationRate || 0),
            restaurantCount: parseInt(benchmarks.restaurantCount || 0),
          },
          comparison: {
            orderValueVsIndustry: calculatePercentageDifference(
              myAggregates.averageOrderValue,
              benchmarks.avgOrderValue
            ),
            ratingVsIndustry: calculatePercentageDifference(
              myAggregates.averageRating,
              benchmarks.avgRating
            ),
          },
          criteria: {
            cuisineType: restaurant.cuisineType,
            city: restaurant.city,
            period: "30 days",
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

// Helper functions
function groupStatsByWeek(stats) {
  const weeks = {};

  stats.forEach((stat) => {
    const date = new Date(stat.date);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!weeks[weekKey]) {
      weeks[weekKey] = [];
    }
    weeks[weekKey].push(stat);
  });

  return Object.keys(weeks).map((weekStart) => ({
    period: weekStart,
    type: "week",
    ...RestaurantStats.calculateAggregates(weeks[weekStart]),
  }));
}

function groupStatsByMonth(stats) {
  const months = {};

  stats.forEach((stat) => {
    const monthKey = stat.date.substring(0, 7); // YYYY-MM

    if (!months[monthKey]) {
      months[monthKey] = [];
    }
    months[monthKey].push(stat);
  });

  return Object.keys(months).map((month) => ({
    period: month,
    type: "month",
    ...RestaurantStats.calculateAggregates(months[month]),
  }));
}

function calculateGrowthRates(current, previous) {
  const growth = {};

  Object.keys(current).forEach((key) => {
    if (typeof current[key] === "number" && typeof previous[key] === "number") {
      if (previous[key] === 0) {
        growth[key] = current[key] > 0 ? 100 : 0;
      } else {
        growth[key] = ((current[key] - previous[key]) / previous[key]) * 100;
      }
      growth[key] = Math.round(growth[key] * 100) / 100;
    }
  });

  return growth;
}

function calculateTrends(stats) {
  if (stats.length < 2) return {};

  const recent = stats.slice(0, 3); // Last 3 days
  const older = stats.slice(3, 6); // Previous 3 days

  const recentAvg = RestaurantStats.calculateAggregates(recent);
  const olderAvg = RestaurantStats.calculateAggregates(older);

  return calculateGrowthRates(recentAvg, olderAvg);
}

function generateInsights(stats) {
  const insights = [];
  const aggregates = RestaurantStats.calculateAggregates(stats);

  // Revenue insights
  if (aggregates.totalRevenue > 0) {
    insights.push({
      type: "revenue",
      message: `Total revenue of €${aggregates.totalRevenue} with an average order value of €${aggregates.averageOrderValue}`,
      impact: "positive",
    });
  }

  // Rating insights
  if (aggregates.averageRating >= 4.5) {
    insights.push({
      type: "rating",
      message: `Excellent customer satisfaction with ${aggregates.averageRating}/5 average rating`,
      impact: "positive",
    });
  } else if (aggregates.averageRating < 3.0) {
    insights.push({
      type: "rating",
      message: `Customer satisfaction needs attention with ${aggregates.averageRating}/5 average rating`,
      impact: "negative",
    });
  }

  // Order completion insights
  if (aggregates.completionRate < 85) {
    insights.push({
      type: "operations",
      message: `Order completion rate of ${aggregates.completionRate}% could be improved`,
      impact: "warning",
    });
  }

  return insights;
}

function generateChartData(stats) {
  return {
    revenue: stats.map((stat) => ({
      x: stat.date,
      y: stat.totalRevenue,
    })),
    orders: stats.map((stat) => ({
      x: stat.date,
      y: stat.totalOrders,
    })),
    ratings: stats.map((stat) => ({
      x: stat.date,
      y: stat.averageRating,
    })),
  };
}
