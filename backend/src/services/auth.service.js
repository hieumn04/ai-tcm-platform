const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { defaultDangerKey } = require('../helpers/authSettings.helper');

class AuthService {
  constructor() {
    this.secretKey = process.env.SECRET_KEY || defaultDangerKey;
    this.tokenExpiry = '24h';
    this.saltRounds = 10;
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload (e.g., { userId: 123 })
   * @returns {Object} - { accessToken, expiresAt }
   */
  generateToken(payload) {
    const accessToken = jwt.sign(payload,this.secretKey,{
      expiresIn: this.tokenExpiry,
    });
    const expiresAt = Date.now() + 3600 * 1000 * 24; // 24 hours in ms

    return { accessToken,expiresAt };
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object|null} - Decoded payload or null if invalid
   */
  verifyToken(token) {
    try {
      return jwt.verify(token,this.secretKey);
    } catch (error) {
      return null;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password,this.saltRounds);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password from database
   * @returns {Promise<boolean>} - True if passwords match
   */
  async comparePassword(password,hash) {
    return await bcrypt.compare(password,hash);
  }

  /**
   * Create authentication response
   * @param {Object} user - User object from database
   * @returns {Object} - Standardized auth response
   */
  createAuthResponse(user) {
    const { accessToken,expiresAt } = this.generateToken({ userId: user.id });

    // Remove sensitive data from user object
    const safeUser = { ...user.toJSON() };
    delete safeUser.password;

    return {
      access_token: accessToken,
      expires_at: expiresAt,
      user: safeUser
    };
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - { isValid: boolean, errors: string[] }
   */
  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new AuthService(); 