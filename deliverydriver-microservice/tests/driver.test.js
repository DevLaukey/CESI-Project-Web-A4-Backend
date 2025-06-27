const request = require("supertest");
const app = require("../server");
const Driver = require("../models/Driver");

describe("Driver Routes", () => {
  describe("POST /api/drivers/register", () => {
    it("should register a new driver successfully", async () => {
      const driverData = {
        email: "test@driver.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+1234567890",
        licenseNumber: "DL123456",
        vehicleInfo: {
          make: "Toyota",
          model: "Camry",
          year: 2020,
          licensePlate: "ABC123",
          color: "White",
        },
      };

      const response = await request(app)
        .post("/api/drivers/register")
        .send(driverData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.driver.email).toBe(driverData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it("should not register driver with invalid email", async () => {
      const driverData = {
        email: "invalid-email",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+1234567890",
        licenseNumber: "DL123456",
      };

      const response = await request(app)
        .post("/api/drivers/register")
        .send(driverData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should not register driver with duplicate email", async () => {
      // Create first driver
      const driver = new Driver({
        email: "test@driver.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+1234567890",
        licenseNumber: "DL123456",
      });
      await driver.save();

      // Try to create another with same email
      const driverData = {
        email: "test@driver.com",
        password: "password456",
        firstName: "Jane",
        lastName: "Smith",
        phoneNumber: "+0987654321",
        licenseNumber: "DL654321",
      };

      const response = await request(app)
        .post("/api/drivers/register")
        .send(driverData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/drivers/login", () => {
    beforeEach(async () => {
      // Create test driver
      const driver = new Driver({
        email: "test@driver.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+1234567890",
        licenseNumber: "DL123456",
      });
      await driver.save();
    });

    it("should login with valid credentials", async () => {
      const response = await request(app).post("/api/drivers/login").send({
        email: "test@driver.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.driver.email).toBe("test@driver.com");
    });

    it("should not login with invalid credentials", async () => {
      const response = await request(app).post("/api/drivers/login").send({
        email: "test@driver.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
