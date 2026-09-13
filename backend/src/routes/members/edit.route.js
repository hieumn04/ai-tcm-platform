const express = require('express');
const router = express.Router();
const defineMember = require('../../models/members.model');
const { DataTypes } = require('sequelize');
const MembersController = require('../../controllers/members.controller');
const MembersValidator = require('../../validators/members.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectManagerFromProjectId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const Member = defineMember(sequelize, DataTypes);
  const membersController = new MembersController(sequelize, Member);

  router.put('/', 
    verifySignedIn, 
    verifyProjectManagerFromProjectId,
    MembersValidator.sanitizeInput,
    MembersValidator.validateUpdateMember,
    (req, res) => membersController.updateMember(req, res)
  );

  return router;
};
