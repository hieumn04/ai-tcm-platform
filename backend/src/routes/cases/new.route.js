const express = require('express');
const router = express.Router();
const defineCase = require('../../models/cases.model');
const defineUser = require('../../models/users.model');
const { DataTypes } = require('sequelize');
const CasesController = require('../../controllers/cases.controller');
const CasesValidator = require('../../validators/cases.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { writeChangeLogs } = require('../../middlewares/changeLog.middleware')(sequelize);
  const { verifyProjectDeveloperFromFolderId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  
  const Case = defineCase(sequelize, DataTypes);
  const User = defineUser(sequelize, DataTypes);
  Case.belongsTo(User, { foreignKey: 'userId' });
  
  const casesController = new CasesController(sequelize, Case);

  router.post('/', 
    verifySignedIn, 
    verifyProjectDeveloperFromFolderId, 
    writeChangeLogs,
    CasesValidator.sanitizeInput,
    CasesValidator.validateCreateCase,
    (req, res) => casesController.createCase(req, res)
  );

  return router;
};
