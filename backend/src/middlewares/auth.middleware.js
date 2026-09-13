const jwt = require('jsonwebtoken');
const { roles, defaultDangerKey } = require('../helpers/authSettings.helper');
const { DataTypes } = require('sequelize');
const defineUser = require('../models/users.model');
const ResponseUtil = require('../utils/response.util');

function authMiddleware(sequelize) {
  function verifySignedIn(req, res, next) {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return ResponseUtil.authError(res, 'Authorization header missing');
    }

    const secretKey = process.env.SECRET_KEY || defaultDangerKey;
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return ResponseUtil.authError(res, 'Invalid authorization format');
    }

    const token = parts[1];
    if (!token) {
      return ResponseUtil.authError(res, 'Access denied');
    }

    try {
      const decoded = jwt.verify(token, secretKey);
      req.userId = typeof decoded === 'object' ? decoded.userId : null;
      
      if (!req.userId) {
        return ResponseUtil.authError(res, 'Invalid token payload');
      }

      // Fetch user role and attach it to the request
      const User = defineUser(sequelize, DataTypes);
      User.findByPk(req.userId)
        .then((user) => {
          if (!user) {
            return ResponseUtil.notFound(res, 'User not found');
          }
          req.role = user.role; // Add role to req
          next();
        })
        .catch((err) => {
          return ResponseUtil.serverError(res, err, 'Error retrieving user data');
        });
    } catch (error) {
      return ResponseUtil.authError(res, 'Invalid token');
    }
  }

  async function verifyAdmin(req, res, next) {
    const adminRoleIndex = roles.findIndex((entry) => entry.uid === 'administrator');
    if (req.role !== adminRoleIndex) {
      return ResponseUtil.forbiddenError(res, 'Admin access required');
    }

    next();
  }

  return {
    verifySignedIn,
    verifyAdmin,
  };
}

module.exports = authMiddleware; 