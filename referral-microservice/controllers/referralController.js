const { v4: uuidv4 } = require("uuid");
const ReferralCode = require("../models/ReferralCode");
const ReferralUsage = require("../models/ReferralUsage");

exports.generateReferralCode = async (req, res) => {
  const uuid = req.user.uuid;

  try {
    const existing = await ReferralCode.findOne({ where: { uuid } });
    if (existing) return res.status(200).json(existing);

    const code = uuidv4().slice(0, 10);
    const newCode = await ReferralCode.create({ uuid, code });

    res.status(201).json(newCode);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetReferralCode = async (req, res) => {
  const uuid = req.user.uuid;

  try {
    const newCode = uuidv4().slice(0, 10);
    const [updated] = await ReferralCode.update(
      { code: newCode },
      { where: { uuid } }
    );

    if (!updated)
      return res.status(404).json({ message: "No referral code found" });

    res.status(200).json({ uuid, new_code: newCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.useReferralCode = async (req, res) => {
  const uuid = req.user.uuid;
  const { code } = req.body;

  try {
    const existingUsage = await ReferralUsage.findOne({ where: { uuid } });
    if (existingUsage) {
      return res
        .status(400)
        .json({ message: "You already used a referral code." });
    }

    const referrer = await ReferralCode.findOne({ where: { code } });
    if (!referrer) {
      return res.status(404).json({ message: "Referral code not found." });
    }

    if (referrer.uuid === uuid) {
      return res.status(400).json({ message: "Cannot refer yourself." });
    }

    await ReferralUsage.create({
      uuid,
      referred_by: referrer.uuid,
      code_used: code,
    });

    res.status(201).json({ message: `Referred by user ${referrer.uuid}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyReferralCode = async (req, res) => {
  const uuid = req.user.uuid;

  try {
    const code = await ReferralCode.findOne({ where: { uuid } });
    if (!code) {
      return res.status(404).json({ message: "No referral code found" });
    }

    res.status(200).json(code);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getWhoReferredMe = async (req, res) => {
  const uuid = req.user.uuid;

  try {
    const usage = await ReferralUsage.findOne({ where: { uuid } });
    if (!usage) {
      return res.status(404).json({ message: "Not referred by anyone" });
    }

    res.status(200).json(usage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPeopleIReferred = async (req, res) => {
  const uuid = req.user.uuid;

  try {
    const referrals = await ReferralUsage.findAll({
      where: { referred_by: uuid },
    });

    res.status(200).json({
      count: referrals.length,
      referred: referrals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
