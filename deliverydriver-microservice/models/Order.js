const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "rejected",
      ],
      default: "pending",
      required: true,
    },
    restaurantId: {
      type: String,
      required: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    driverId: {
      type: String,
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryAddress: {
      street: String,
      city: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    restaurantAddress: {
      street: String,
      city: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    items: [
      {
        name: String,
        quantity: Number,
        price: Number,
      },
    ],
    deliveryFee: {
      type: Number,
      default: 0,
    },
    estimatedDeliveryTime: {
      type: Number, // in minutes
      default: 30,
    },
    specialInstructions: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    confirmedAt: Date,
    deliveryAcceptedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    rejectedAt: Date,
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

// Indexes for performance
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ driverId: 1, status: 1 });
orderSchema.index({ orderId: 1 }, { unique: true });

// Pre-save middleware to generate UUID if not provided
orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = uuidv4();
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
