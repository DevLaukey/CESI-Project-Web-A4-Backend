const axios = require("axios");

class OrderService {
  constructor() {
    this.orderServiceUrl =
      process.env.ORDER_SERVICE_URL || "http:localhost:3001";

    
    this.deliveryRates = {
      baseRate: parseFloat(process.env.BASE_DELIVERY_RATE) || 3.5,
      distanceRate: parseFloat(process.env.DISTANCE_RATE) || 0.5,
      minimumFee: parseFloat(process.env.MIN_DELIVERY_FEE) || 2.5,
      maximumFee: parseFloat(process.env.MAX_DELIVERY_FEE) || 25.0,

      
      vehicleMultipliers: {
        bike: 1.0,
        scooter: 1.2,
        car: 1.5,
        truck: 2.0,
      },

      
      surgeMultipliers: {
        normal: 1.0,
        busy: 1.3,
        peak: 1.5,
        urgent: 2.0,
      },
    };
  }

  
  async getAvailableOrders(params = {}) {
    try {
      const { page = 1, limit = 20 } = params;

      const response = await axios.get(`${this.orderServiceUrl}/orders`, {
        timeout: 10000,
      });


      
      const availableOrders = response.data.filter(
        (order) => order.status === "confirmed" && !order.driver_assigned
      );

      return {
        success: true,
        orders: availableOrders.map((order) => ({
          id: order.id,
          uuid: order.uuid,
          restaurantId: order.restaurant_id,
          restaurant: order.restaurant_name || "Restaurant", 
          paymentId: order.payment_id,
          deliveryAddress: order.delivery_address,
          address: order.delivery_address, 
          customer: order.customer_name || "Customer", 
          items: order.items?.length || 1, 
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,

          
          distance: this.calculateDistance(order), 
          estimatedTime: this.calculateEstimatedTime(order), 
          priority: this.determinePriority(order), 
          vehicleType: order.preferred_vehicle || "bike", 

          
          estimatedEarnings: this.calculateDeliveryFee(order),
          earnings: this.formatCurrency(this.calculateDeliveryFee(order)), 
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: availableOrders.length,
          pages: Math.ceil(availableOrders.length / parseInt(limit)),
          currentPage: parseInt(page),
          totalOrders: availableOrders.length,
          hasNext: availableOrders.length > parseInt(page) * parseInt(limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error("Failed to fetch available orders:", error.message);

      
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch orders",
        orders: [], 
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      };
    }
  }

  
  async acceptOrder(token, orderId, driverId) {
    try {

      const orderResponse = await axios.get(
        `${this.orderServiceUrl}/orders/${orderId}`,
        {
          timeout: 10000,
        }
      );


      const order = orderResponse.data;

      
      if (!order || !order.id) {
        return {
          success: false,
          error: "Order not found",
          };
        }   

      if (order.status !== "confirmed") {
        return {
          success: false,
          error: "Order is no longer available",
        };
      }

      
      const response = await axios.patch(
        `${this.orderServiceUrl}/orders/${orderId}/status`,
        {
          status: "out_for_delivery"
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log(`Order ${orderId} accepted by driver ${driverId}`); 

      
      const acceptedOrder = {
        ...response.data,
        driverId: driverId,
        acceptedAt: new Date().toISOString(),
        estimatedDeliveryTime: new Date(Date.now() + 30 * 60000).toISOString(), 
      };

      console.log(
        `Order ${orderId} successfully accepted by driver ${driverId}`
      );

      return {
        success: true,
        order: acceptedOrder,
        message: "Order accepted successfully",
      };
    } catch (error) {
      console.error("Failed to accept order:", error.message);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to accept order",
      };
    }
  }

  
  async rejectOrder(orderId, driverId) {
    try {
      console.log(`Driver ${driverId} rejecting order ${orderId}`);

      
      

      return {
        success: true,
        message: "Order rejected successfully",
        data: {
          orderId,
          driverId,
          rejectedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Failed to reject order:", error.message);
      return {
        success: false,
        error: error.message || "Failed to reject order",
      };
    }
  }

  
  async completeDelivery(orderId, driverId) {
    try {
      console.log(
        `Driver ${driverId} completing delivery for order ${orderId}`
      );

      const response = await axios.patch(
        `${this.orderServiceUrl}/orders/${orderId}/status`,
        {
          status: "delivered",
          delivered_at: new Date().toISOString(),
          completed_by: driverId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        order: response.data,
        message: "Delivery completed successfully",
      };
    } catch (error) {
      console.error("Failed to complete delivery:", error.message);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to complete delivery",
      };
    }
  }

  
  async updateOrderStatus(token, orderId, status, driverId, additionalData = {}) {
    try {
      const response = await axios.patch(
        `${this.orderServiceUrl}/orders/${orderId}/status`,
        {
          status,
          updated_by: driverId,
          updated_at: new Date().toISOString(),
          ...additionalData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        order: {
          ...response.data,
          driverId: driverId,
          ...additionalData,
        },
      };
    } catch (error) {
      console.error("Failed to update order status:", error.message);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update order",
      };
    }
  }

  
  async getOrderDetails(token, orderId) {
    try {
      const response = await axios.get(
        `${this.orderServiceUrl}/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        }
      );

      console.log(response.data); 
      return {
        success: true,
        order: response.data,
      };
    } catch (error) {
      console.error("Failed to fetch order details:", error.message);
      return {
        success: false,
        error:
          error.response?.data?.message || error.message || "Order not found",
      };
    }
  }

  
  async getDriverOrders(driverId, status = null) {
    try {
      console.log(
        `Getting orders for driver ${driverId} with status ${status}`
      );

      
      const response = await axios.get(`${this.orderServiceUrl}/orders`, {
        timeout: 10000,
      });

      console.log("Fetched orders:", response.data); 

      
      if (!response.data || !Array.isArray(response.data)) {
        return {
          success: false,
          error: "Invalid order data",
          orders: [],
        };
      }
      
      const driverOrders = response.data.filter((order) => {
        return order.driverId === driverId;
      });

      console.log(`Found ${driverOrders.length} orders for driver ${driverId}`);

      
      if (status) {
        driverOrders = driverOrders.filter((order) => order.status === status);
      }

      
      const transformedOrders = driverOrders.map((order) => ({
        id: order.id,
        restaurant: order.restaurant_name || "Restaurant",
        customer: order.customer_name || "Customer",
        address: order.delivery_address,
        completedAt: order.delivered_at || order.updatedAt,
        earnings: this.formatCurrency(this.calculateDeliveryFee(order)),
        rating: order.driver_rating || 0,
        status: order.status,
        date: new Date(order.createdAt).toLocaleDateString(),
      }));

      return {
        success: true,
        orders: transformedOrders,
      };
    } catch (error) {
      console.error("Failed to fetch driver orders:", error.message);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch orders",
        orders: [], 
      };
    }
  }

  
  
  

  
  calculateDeliveryFee(order, vehicleType = "bike", priority = "normal") {
    try {
      const {
        baseRate,
        distanceRate,
        minimumFee,
        maximumFee,
        vehicleMultipliers,
        surgeMultipliers,
      } = this.deliveryRates;

      
      const estimatedDistance = this.calculateDistance(order);

      
      let fee = baseRate + estimatedDistance * distanceRate;

      
      const vehicleMultiplier = vehicleMultipliers[vehicleType] || 1.0;
      fee *= vehicleMultiplier;

      
      const surgeMultiplier = surgeMultipliers[priority] || 1.0;
      fee *= surgeMultiplier;

      
      fee = Math.max(minimumFee, Math.min(fee, maximumFee));

      return parseFloat(fee.toFixed(2));
    } catch (error) {
      console.error("Error calculating delivery fee:", error);
      
      return this.deliveryRates.minimumFee;
    }
  }

  
  calculateDistance(order) {
    try {
      
      

      if (order.estimated_distance) {
        return parseFloat(order.estimated_distance);
      }

      
      const orderValue = order.total_amount || 20;
      const estimatedDistance = Math.max(1, Math.min(10, orderValue / 10));

      return parseFloat(estimatedDistance.toFixed(1));
    } catch (error) {
      console.error("Error calculating distance:", error);
      return 2.5; 
    }
  }

  
  calculateEstimatedTime(order) {
    try {
      const distance = this.calculateDistance(order);
      const baseTime = 15; 
      const timePerKm = 3; 

      const totalMinutes = baseTime + distance * timePerKm;
      const minTime = Math.max(10, totalMinutes - 5);
      const maxTime = totalMinutes + 10;

      return `${minTime}-${maxTime} min`;
    } catch (error) {
      console.error("Error calculating estimated time:", error);
      return "25-35 min"; 
    }
  }

  
  determinePriority(order) {
    try {
      const now = new Date();
      const orderTime = new Date(order.createdAt);
      const minutesOld = (now - orderTime) / (1000 * 60);

      if (minutesOld > 30) return "urgent";
      if (minutesOld > 15) return "busy";
      return "normal";
    } catch (error) {
      console.error("Error determining priority:", error);
      return "normal";
    }
  }

  
  formatCurrency(amount) {
    try {
      return `€${parseFloat(amount).toFixed(2)}`;
    } catch (error) {
      return `€${this.deliveryRates.minimumFee.toFixed(2)}`;
    }
  }

  
  
  

  
  async healthCheck() {
    try {
      const response = await axios.get(`${this.orderServiceUrl}/health`, {
        timeout: 5000,
      });
      return {
        success: true,
        status: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: "Order service is not available",
      };
    }
  }

  
  getDeliveryRates() {
    return this.deliveryRates;
  }
}

module.exports = new OrderService();
