const express = require('express');
const router = express.Router();
const defineUser = require('../../models/users.model');
const { DataTypes } = require('sequelize');
const UsersController = require('../../controllers/users.controller');
const UsersValidator = require('../../validators/users.validator');

module.exports = function (sequelize) {
  const User = defineUser(sequelize, DataTypes);
  const usersController = new UsersController(sequelize, User);

  router.post('/signin', 
    UsersValidator.sanitizeInput,
    UsersValidator.validateSignIn,
    (req, res) => usersController.signIn(req, res)
  );

  return router;
};
