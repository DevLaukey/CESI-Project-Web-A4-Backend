const mongoose = require("mongoose");

const driverProfileSchema = new mongoose.Schema(
  {
    driverId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Contact Information
    phone_number: {
      type: String,
      required: true,
      index: true,
    },

    // License & Verification
    license_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Vehicle Information
    vehicle_type: {
      type: String,
      required: true,
      enum: ["bike", "scooter", "car", "truck"],
    },
    vehicle_make: {
      type: String,
      default: null,
    },
    vehicle_model: {
      type: String,
      default: null,
    },
    vehicle_year: {
      type: Number,
      default: null,
      min: 1990,
      max: new Date().getFullYear() + 1,
    },
    vehicle_color: {
      type: String,
      default: null,
    },
    license_plate: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    insurance_number: {
      type: String,
      default: null,
    },

    // Emergency Contact
    emergency_contact: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },

    // Financial Information
    bank_account_iban: {
      type: String,
      default: null,
      uppercase: true,
    },
    tax_id: {
      type: String,
      default: null,
    },

    // Status & Verification
    status: {
      type: String,
      enum: ["pending_verification", "verified", "suspended", "rejected"],
      default: "pending_verification",
      index: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_available: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Documents (for future file uploads)
    documents: {
      driver_license_front: { type: String, default: null },
      driver_license_back: { type: String, default: null },
      vehicle_registration: { type: String, default: null },
      insurance_certificate: { type: String, default: null },
      profile_photo: { type: String, default: null },
      vehicle_photo: { type: String, default: null },
    },

    // Verification Details
    verification_notes: {
      type: String,
      default: null,
    },
    verified_at: {
      type: Date,
      default: null,
    },
    verified_by: {
      type: String,
      default: null,
    },

    // Location (for active drivers)
    current_location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      last_updated: { type: Date, default: null },
    },

    // Statistics
    stats: {
      total_deliveries: { type: Number, default: 0 },
      completed_deliveries: { type: Number, default: 0 },
      cancelled_deliveries: { type: Number, default: 0 },
      total_earnings: { type: Number, default: 0 },
      average_rating: { type: Number, default: 0 },
      total_ratings: { type: Number, default: 0 },
    },

    // Timestamps
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes for performance
driverProfileSchema.index({ driverId: 1, status: 1 });
driverProfileSchema.index({ vehicle_type: 1, is_available: 1 });
driverProfileSchema.index({ license_number: 1 }, { unique: true });
driverProfileSchema.index({ license_plate: 1 }, { unique: true });

// Pre-save middleware to update timestamps
driverProfileSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Virtual for full vehicle name
driverProfileSchema.virtual("vehicle_full_name").get(function () {
  if (this.vehicle_type === "bike") {
    return "Bicycle";
  }
  return `${this.vehicle_year || ""} ${this.vehicle_make || ""} ${
    this.vehicle_model || ""
  }`.trim();
});

// Method to check if motorized vehicle
driverProfileSchema.methods.isMotorizedVehicle = function () {
  return this.vehicle_type !== "bike";
};

// Method to get required documents based on vehicle type
driverProfileSchema.methods.getRequiredDocuments = function () {
  const baseDocuments = ["profile_photo"];

  if (this.isMotorizedVehicle()) {
    baseDocuments.push(
      "driver_license_front",
      "driver_license_back",
      "vehicle_registration",
      "insurance_certificate",
      "vehicle_photo"
    );
  }

  return baseDocuments;
};

const DriverProfile = mongoose.model("DriverProfile", driverProfileSchema);

module.exports = DriverProfile;
