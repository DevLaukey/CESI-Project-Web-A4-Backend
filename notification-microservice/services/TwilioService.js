
const twilio = require('twilio');
const config = require('../config/twilio');

class TwilioService {
  constructor() {
    this.client = twilio(config.accountSid, config.authToken);
  }

  async sendSMS(phone, message, options = {}) {
    try {
      const messageOptions = {
        body: message,
        from: config.phoneNumber,
        to: phone,
        ...options
      };

      const result = await this.client.messages.create(messageOptions);
      
      console.log(`✅ SMS sent to ${phone}: ${result.sid}`);
      return { 
        success: true, 
        sid: result.sid,
        status: result.status 
      };
    } catch (error) {
      console.error(`❌ SMS failed to ${phone}:`, error.message);
      return { 
        success: false, 
        error: error.message,
        code: error.code 
      };
    }
  }

  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        success: true,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async validatePhoneNumber(phoneNumber) {
    try {
      const lookup = await this.client.lookups.v1
        .phoneNumbers(phoneNumber)
        .fetch();
      
      return {
        valid: true,
        phoneNumber: lookup.phoneNumber,
        countryCode: lookup.countryCode,
        nationalFormat: lookup.nationalFormat
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new TwilioService();