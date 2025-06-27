const request = require("supertest");
const app = require("../server");
const Order = require("../models/Order");
const Driver = require("../models/Driver");

describe("Order Routes", () => {
  let driverToken;
  let testOrder;

  beforeAll(async () => {
    // Create test driver
    const driver = new Driver({
      email: "test@driver.com",
      password: "password123",
      firstName: "Test",
      lastName: "Driver",
      phoneNumber: "+1234567890",
      licenseNumber: "TEST123",
    });
    await driver.save();

    // Login to get token
    const loginResponse = await request(app).post("/api/drivers/login").send({
      email: "test@driver.com",
      password: "password123",
    });

    driverToken = loginResponse.body.data.token;

    // Create test order
    testOrder = new Order({
      status: "confirmed",
      restaurantId: "rest123",
      customerId: "cust123",
      totalAmount: 500,
      deliveryFee: 50,
    });
    await testOrder.save();
  });

  afterAll(async () => {
    await Order.deleteMany({});
    await Driver.deleteMany({});
  });

  describe("GET /api/orders/available", () => {
    it("should return available orders", async () => {
      const response = await request(app)
        .get("/api/orders/available")
        .set("Authorization", `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.orders)).toBe(true);
    });
  });

  describe("POST /api/orders/:orderId/accept", () => {
    it("should accept an available order", async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder.orderId}/accept`)
        .set("Authorization", `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe("out_for_delivery");
    });

    it("should not accept already accepted order", async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder.orderId}/accept`)
        .set("Authorization", `Bearer ${driverToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
