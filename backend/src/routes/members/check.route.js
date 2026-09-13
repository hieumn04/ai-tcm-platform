const express = require('express');
const router = express.Router();
const defineMember = require('../../models/members.model');
const defineProject = require('../../models/projects.model');
const { DataTypes } = require('sequelize');
const MembersController = require('../../controllers/members.controller');
const MembersValidator = require('../../validators/members.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const Member = defineMember(sequelize, DataTypes);
  const Project = defineProject(sequelize, DataTypes);
  const membersController = new MembersController(sequelize, Member);

  router.get('/check', 
    verifySignedIn,
    MembersValidator.validateCheckPermissions,
    (req, res) => membersController.checkMemberPermissions(req, res)
  );

  return router;
};
