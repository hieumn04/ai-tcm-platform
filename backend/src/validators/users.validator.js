const authService = require('../services/auth.service');
const ResponseUtil = require('../utils/response.util');

class UsersValidator {
  /**
   * Validate signin request
   */
  static validateSignIn(req, res, next) {
    const { email, password } = req.body;
    const errors = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!UsersValidator.isValidEmail(email)) {
      errors.push('Please provide a valid email address');
    }

    if (!password) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate signup request
   */
  static validateSignUp(req, res, next) {
    const { email, password, username } = req.body;
    const errors = [];

    // Email validation
    if (!email) {
      errors.push('Email is required');
    } else if (!UsersValidator.isValidEmail(email)) {
      errors.push('Please provide a valid email address');
    }

    // Username validation
    if (!username) {
      errors.push('Username is required');
    } else if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    } else if (username.length > 50) {
      errors.push('Username must be less than 50 characters');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    } else {
      const passwordValidation = authService.validatePassword(password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate reset password request
   */
  static validateResetPassword(req, res, next) {
    const { email, newPassword } = req.body;
    const errors = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!UsersValidator.isValidEmail(email)) {
      errors.push('Please provide a valid email address');
    }

    if (!newPassword) {
      errors.push('New password is required');
    } else {
      const passwordValidation = authService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate search users request
   */
  static validateSearch(req, res, next) {
    const { projectId, search } = req.query;
    const errors = [];

    if (!projectId || !Number.isInteger(parseInt(projectId))) {
      errors.push('Valid project ID is required');
    }

    if (search && typeof search !== 'string') {
      errors.push('Search term must be a string');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate user update request
   */
  static validateUpdate(req, res, next) {
    const { newRole } = req.body;
    const { userId } = req.params;
    const errors = [];

    if (!userId || isNaN(userId)) {
      errors.push('Valid user ID is required');
    }

    if (newRole !== undefined) {
      if (isNaN(newRole) || newRole < 0) {
        errors.push('Role must be a valid non-negative number');
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Sanitize input by trimming whitespace
   */
  static sanitizeInput(req, res, next) {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
    next();
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = UsersValidator; 