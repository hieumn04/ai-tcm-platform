const express = require('express');
const router = express.Router();
const defineUser = require('../../models/users.model');
const { DataTypes } = require('sequelize');
const UsersController = require('../../controllers/users.controller');

module.exports = function (sequelize) {
  const { verifySignedIn, verifyAdmin } = require('../../middlewares/auth.middleware')(sequelize);
  const User = defineUser(sequelize, DataTypes);
  const usersController = new UsersController(sequelize, User);

  router.get('/', 
    verifySignedIn, 
    verifyAdmin, 
    (req, res) => usersController.listUsers(req, res)
  );

  router.put('/:userId', 
    verifySignedIn, 
    verifyAdmin, 
    (req, res) => usersController.updateUserRole(req, res)
  );

  return router;
};
