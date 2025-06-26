
const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  phone: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^\+[1-9]\d{1,14}$/.test(v); // E.164 format
      },
      message: 'Phone number must be in E.164 format'
    }
  },
  smsEnabled: { 
    type: Boolean, 
    default: true 
  },
  orderNotifications: { 
    type: Boolean, 
    default: true 
  },
  deliveryNotifications: { 
    type: Boolean, 
    default: true 
  },
  paymentNotifications: { 
    type: Boolean, 
    default: true 
  },
  systemNotifications: { 
    type: Boolean, 
    default: false 
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: '22:00' },
    endTime: { type: String, default: '08:00' },
    timezone: { type: String, default: 'UTC' }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

userPreferencesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);