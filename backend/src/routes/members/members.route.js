const express = require('express');
const router = express.Router();
const defineUser = require('../../models/users.model');
const defineMember = require('../../models/members.model');
const { DataTypes } = require('sequelize');
const MembersController = require('../../controllers/members.controller');
const MembersValidator = require('../../validators/members.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromProjectId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const User = defineUser(sequelize, DataTypes);
  const Member = defineMember(sequelize, DataTypes);
  Member.belongsTo(User, { foreignKey: 'userId' });
  const membersController = new MembersController(sequelize, Member);

  router.get('/', 
    verifySignedIn, 
    verifyProjectVisibleFromProjectId,
    MembersValidator.validateListMembers,
    (req, res) => membersController.listMembers(req, res)
  );

  return router;
};
