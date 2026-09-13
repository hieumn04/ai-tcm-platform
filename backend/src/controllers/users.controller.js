const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { roles, defaultDangerKey } = require('../helpers/authSettings.helper');
const ResponseUtil = require('../utils/response.util');

class UsersController {
  constructor(sequelize, User) {
    this.sequelize = sequelize;
    this.User = User;
    this.secretKey = process.env.SECRET_KEY || defaultDangerKey;
    this.setupAssociations();
  }

  setupAssociations() {
    const { DataTypes } = require('sequelize');
    const defineMember = require('../models/members.model');
    
    this.Member = defineMember(this.sequelize, DataTypes);
  }

  async signIn(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return ResponseUtil.validationError(res, ['Email and password are required']);
      }
      
      const user = await this.User.findOne({
        where: { email: email }
      });
      
      if (!user) {
        return ResponseUtil.authError(res, 'Authentication failed');
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return ResponseUtil.authError(res, 'Authentication failed');
      }

      const accessToken = jwt.sign({ userId: user.id }, this.secretKey, {
        expiresIn: '24h',
      });
      const expiresAt = Date.now() + 3600 * 1000 * 24;

      user.password = undefined;
      return ResponseUtil.success(res, { 
        access_token: accessToken, 
        expires_at: expiresAt, 
        user 
      }, 'Sign in successful');
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Sign in failed');
    }
  }

  async signUp(req, res) {
    try {
      const { email, password, username } = req.body;
      
      if (!email || !password || !username) {
        return ResponseUtil.validationError(res, ['Email, password, and username are required']);
      }

      const existingUser = await this.User.findOne({ where: { email } });
      if (existingUser) {
        return ResponseUtil.error(res, 'Email already registered', 409);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userCount = await this.User.count();
      const initialRole = userCount > 0
        ? roles.findIndex((entry) => entry.uid === 'user')
        : roles.findIndex((entry) => entry.uid === 'administrator');

      const user = await this.User.create({
        email,
        password: hashedPassword,
        username: username,
        role: initialRole,
      });

      const accessToken = jwt.sign({ userId: user.id }, this.secretKey, {
        expiresIn: '24h',
      });
      const expiresAt = Date.now() + 3600 * 1000 * 24;

      user.password = undefined;
      return ResponseUtil.created(res, { 
        access_token: accessToken, 
        expires_at: expiresAt, 
        user 
      }, 'User created successfully');
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Sign up failed');
    }
  }

  async resetPassword(req, res) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return ResponseUtil.validationError(res, ['Email and new password are required']);
      }

      const user = await this.User.findOne({ where: { email } });
      if (!user) {
        return ResponseUtil.notFound(res, 'If the email exists, a password reset will be processed');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      const accessToken = jwt.sign(
        { userId: user.id, iat: Math.floor(Date.now() / 1000) },
        this.secretKey,
        { expiresIn: '24h' }
      );
      const expiresAt = Date.now() + 3600 * 1000 * 24;

      return ResponseUtil.success(res, {
        access_token: accessToken,
        expires_at: expiresAt,
        userId: user.id,
      }, 'Password reset successful');
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'An error occurred during password reset');
    }
  }

  async searchUsers(req, res) {
    try {
      const { projectId, search } = req.query;
      
      if (!projectId) {
        return ResponseUtil.validationError(res, ['projectId is required']);
      }

      const trimmedSearch = (search || "").trim();
      if (trimmedSearch.length === 0) {
        return ResponseUtil.success(res, [], 'No search term provided');
      }

      const { Op } = require('sequelize');

      let where = {
        [Op.or]: [
          { email: { [Op.like]: `%${trimmedSearch}%` } }, 
          { username: { [Op.like]: `%${trimmedSearch}%` } }
        ],
      };

      const members = await this.Member.findAll({
        where: { projectId },
        attributes: ['userId'],
      });
      
      const excludeIdArray = members.map((member) => member.userId);
      excludeIdArray.push(req.userId);
      where.id = { [Op.notIn]: excludeIdArray };

      const users = await this.User.findAll({
        where,
        attributes: ['id', 'email', 'username', 'role', 'avatarPath'],
        limit: 7,
      });

      return ResponseUtil.success(res, users, 'Users retrieved successfully');
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to search users');
    }
  }

  async findUser(req, res) {
    try {
      const userId = req.params.userId;
      if (!userId) {
        return ResponseUtil.validationError(res, ['userId is required']);
      }

      const user = await this.User.findByPk(userId, {
        attributes: ['id', 'email', 'username', 'role', 'avatarPath'],
      });
      
      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }
      
      return ResponseUtil.success(res, user, 'User retrieved successfully');
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to find user');
    }
  }

  async listUsers(req, res) {
    try {
      const users = await this.User.findAll({
        attributes: ['id', 'email', 'username', 'role', 'avatarPath'],
      });
      return ResponseUtil.success(res, users, 'Users retrieved successfully');
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to list users');
    }
  }

  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { newRole } = req.body;

      if (!userId) {
        return ResponseUtil.validationError(res, ['userId is required']);
      }

      if (newRole === undefined || newRole === null) {
        return ResponseUtil.validationError(res, ['newRole is required']);
      }

      if (!Number.isInteger(newRole) || newRole < 0 || newRole >= roles.length) {
        return ResponseUtil.validationError(res, ['Invalid role value']);
      }

      const user = await this.User.findByPk(userId, {
        attributes: ['id', 'email', 'username', 'role', 'avatarPath'],
      });

      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      // Check if trying to change the last admin
      if (user.role === roles.findIndex((entry) => entry.uid === 'administrator')) {
        const adminCount = await this.User.count({
          where: { role: roles.findIndex((entry) => entry.uid === 'administrator') }
        });
        
        if (adminCount <= 1 && newRole !== roles.findIndex((entry) => entry.uid === 'administrator')) {
          return ResponseUtil.error(res, 'Cannot remove the last administrator', 403);
        }
      }

      await user.update({ role: newRole });

      return ResponseUtil.success(res, { user }, 'User role updated successfully');
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to update user role');
    }
  }
}

module.exports = UsersController; 