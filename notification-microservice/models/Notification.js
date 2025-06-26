const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true 
  },
  userType: { 
    type: String, 
    enum: ['customer', 'restaurant', 'driver'], 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 1600 // SMS character limit
  },
  type: { 
    type: String, 
    enum: ['order', 'delivery', 'payment', 'system'], 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  twilioSid: {
    type: String,
    index: true
  },
  data: { 
    type: Object, 
    default: {} 
  },
  sentAt: Date,
  deliveredAt: Date,
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on save
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ twilioSid: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
