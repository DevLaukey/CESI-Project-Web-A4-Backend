const mongoose = require("mongoose");
const Driver = require("../models/Driver");
const Order = require("../models/Order");
require("dotenv").config();

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Create indexes for better performance
    await Driver.createIndexes();
    await Order.createIndexes();
    console.log("✅ Database indexes created");

    // Create sample data (optional)
    await createSampleData();

    console.log("✅ Database setup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

async function createSampleData() {
  // Check if data already exists
  const driverCount = await Driver.countDocuments();
  if (driverCount > 0) {
    console.log("📝 Sample data already exists, skipping creation");
    return;
  }

  // Create sample driver
  const sampleDriver = new Driver({
    email: "john.driver@example.com",
    password: "password123",
    firstName: "John",
    lastName: "Doe",
    phoneNumber: "+1234567890",
    licenseNumber: "DL123456789",
    vehicleInfo: {
      make: "Toyota",
      model: "Camry",
      year: 2020,
      licensePlate: "ABC123",
      color: "White",
    },
  });
  await sampleDriver.save();

  // Create sample orders
  const sampleOrders = [
    {
      status: "confirmed",
      restaurantId: "rest_001",
      customerId: "cust_001",
      totalAmount: 2500,
      deliveryFee: 300,
      deliveryAddress: {
        street: "123 Main St",
        city: "New York",
        zipCode: "10001",
        coordinates: { lat: 40.7589, lng: -73.9851 },
      },
      restaurantAddress: {
        street: "456 Restaurant Ave",
        city: "New York",
        zipCode: "10002",
        coordinates: { lat: 40.7505, lng: -73.9934 },
      },
      items: [
        { name: "Burger", quantity: 2, price: 1200 },
        { name: "Fries", quantity: 1, price: 600 },
        { name: "Coke", quantity: 2, price: 350 },
      ],
    },
    {
      status: "confirmed",
      restaurantId: "rest_002",
      customerId: "cust_002",
      totalAmount: 1800,
      deliveryFee: 250,
      items: [{ name: "Pizza", quantity: 1, price: 1800 }],
    },
  ];

  for (const orderData of sampleOrders) {
    const order = new Order(orderData);
    await order.save();
  }

  console.log("✅ Sample data created successfully");
  console.log(`📧 Sample driver email: john.driver@example.com`);
  console.log(`🔑 Sample driver password: password123`);
}

// Run setup
setupDatabase();
