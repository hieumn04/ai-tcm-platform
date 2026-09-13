const express = require('express');
const router = express.Router();
const defineCase = require('../../models/cases.model');
const defineUser = require('../../models/users.model');
const defineDevStatus = require('../../models/devStatus.model');
const { DataTypes } = require('sequelize');
const CasesController = require('../../controllers/cases.controller');
const CasesValidator = require('../../validators/cases.validator');

module.exports = function (sequelize) {
  const Case = defineCase(sequelize, DataTypes);
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromFolderId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const User = defineUser(sequelize, DataTypes);
  const DevStatus = defineDevStatus(sequelize, DataTypes);

  Case.belongsTo(User, { foreignKey: 'userId' });
  Case.hasMany(DevStatus, { foreignKey: 'caseId', onDelete: 'CASCADE' });
  DevStatus.belongsTo(Case, { foreignKey: 'caseId' });
  
  const casesController = new CasesController(sequelize, Case);

  router.get('/', 
    verifySignedIn, 
    verifyProjectVisibleFromFolderId,
    CasesValidator.validateListCases,
    (req, res) => casesController.listCases(req, res)
  );

  return router;
};
