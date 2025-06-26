const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User } = require("../models");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../validators/authValidator");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

class AuthController {
  // Register new user
  static async register(req, res, next) {
    try {
      // Validate input
      const { error, value } = registerValidation.validate(req.body);

      console.log("Register validation result:", value, error);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }


      console.log("Registering user:", value);
      const { email, password, userType, firstName, lastName, ...otherData } =
        value;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          error: "User already exists",
          message: "An account with this email already exists",
        });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Create user
      const user = await User.create({
        email,
        passwordHash,
        userType,
        firstName,
        lastName,
        verificationToken,
        ...otherData,
      });

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          userType: user.userType,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      // TODO: Send verification email
      console.log(`Verification token for ${email}: ${verificationToken}`);

      res.status(201).json({
        message: "User registered successfully",
        user: user.toSafeJSON(),
        token,
        verificationRequired: true,
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  static async login(req, res, next) {
    try {
      // Validate input
      const { error, value } = loginValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { email, password } = value;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          error: "Invalid credentials",
          message: "Email or password is incorrect",
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          error: "Account disabled",
          message: "Your account has been disabled. Please contact support.",
        });
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        return res.status(423).json({
          error: "Account locked",
          message:
            "Account is temporarily locked due to too many failed login attempts. Please try again later.",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Increment login attempts
        await user.increment("loginAttempts");

        // Lock account if max attempts reached
        if (user.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
          await user.update({
            lockUntil: Date.now() + LOCK_TIME,
          });
        }

        return res.status(401).json({
          error: "Invalid credentials",
          message: "Email or password is incorrect",
        });
      }

      // Reset login attempts on successful login
      await user.update({
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date(),
      });

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          userType: user.userType,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      res.json({
        message: "Login successful",
        user: user.toSafeJSON(),
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify email
  static async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;

      const user = await User.findOne({
        where: { verificationToken: token },
      });

      if (!user) {
        return res.status(400).json({
          error: "Invalid verification token",
          message: "The verification link is invalid or has expired",
        });
      }

      await user.update({
        isVerified: true,
        verificationToken: null,
      });

      res.json({
        message: "Email verified successfully",
        user: user.toSafeJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Forgot password
  static async forgotPassword(req, res, next) {
    try {
      // Validate input
      const { error, value } = forgotPasswordValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { email } = value;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if user exists or not
        return res.json({
          message:
            "If an account with that email exists, a password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = Date.now() + 3600000; // 1 hour

      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      });

      // TODO: Send password reset email
      console.log(`Password reset token for ${email}: ${resetToken}`);

      res.json({
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    } catch (error) {
      next(error);
    }
  }

  // Reset password
  static async resetPassword(req, res, next) {
    try {
      // Validate input
      const { error, value } = resetPasswordValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { token, password } = value;

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: {
            [require("sequelize").Op.gt]: Date.now(),
          },
        },
      });

      if (!user) {
        return res.status(400).json({
          error: "Invalid or expired token",
          message: "The password reset link is invalid or has expired",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      await user.update({
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        loginAttempts: 0,
        lockUntil: null,
      });

      res.json({
        message: "Password reset successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  static async refreshToken(req, res, next) {
    try {
      const user = req.user; // From auth middleware

      // Generate new JWT
      const token = jwt.sign(
        {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          userType: user.userType,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      res.json({
        message: "Token refreshed successfully",
        token,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
