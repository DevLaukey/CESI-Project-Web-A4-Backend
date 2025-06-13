const crypto = require("crypto");
const logger = require("../utils/logger");

const webhookAuth = {
  // Firebase Cloud Messaging webhook authentication
  fcm: (req, res, next) => {
    // Implement FCM webhook signature verification
    const signature = req.headers["firebase-signature"];
    if (!signature) {
      return res.status(401).json({ error: "Missing FCM signature" });
    }

    // Verify signature logic here
    next();
  },

  // Twilio webhook authentication
  twilio: (req, res, next) => {
    const twilioSignature = req.headers["x-twilio-signature"];
    if (!twilioSignature) {
      return res.status(401).json({ error: "Missing Twilio signature" });
    }

    // Verify Twilio signature
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha1", process.env.TWILIO_AUTH_TOKEN)
      .update(url + body)
      .digest("base64");

    if (twilioSignature !== expectedSignature) {
      return res.status(401).json({ error: "Invalid Twilio signature" });
    }

    next();
  },

  // Web Push webhook authentication
  webpush: (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.WEBPUSH_API_KEY) {
      return res.status(401).json({ error: "Invalid Web Push API key" });
    }
    next();
  },

  // Generic webhook authentication
  generic: (req, res, next) => {
    const provider = req.params.provider;
    const apiKey = req.headers["x-api-key"];

    // Verify based on provider
    if (
      !apiKey ||
      apiKey !== process.env[`${provider.toUpperCase()}_WEBHOOK_KEY`]
    ) {
      return res.status(401).json({ error: "Invalid webhook authentication" });
    }

    next();
  },
};

module.exports = webhookAuth;
