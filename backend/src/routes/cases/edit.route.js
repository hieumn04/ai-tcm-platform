const express = require('express');
const router = express.Router();
const defineCase = require('../../models/cases.model');
const { DataTypes } = require('sequelize');
const CasesController = require('../../controllers/cases.controller');
const CasesValidator = require('../../validators/cases.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { writeChangeLogs } = require('../../middlewares/changeLog.middleware')(sequelize);
  const { verifyProjectDeveloperFromCaseId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  
  const Case = defineCase(sequelize, DataTypes);
  const casesController = new CasesController(sequelize, Case);

  router.put('/:caseId', 
    verifySignedIn, 
    verifyProjectDeveloperFromCaseId, 
    writeChangeLogs,
    CasesValidator.sanitizeInput,
    CasesValidator.validateUpdateCase,
    (req, res) => casesController.updateCase(req, res)
  );

  return router;
};
