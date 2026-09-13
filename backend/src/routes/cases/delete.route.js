const express = require('express');
const router = express.Router();
const defineCase = require('../../models/cases.model');
const { DataTypes } = require('sequelize');
const CasesController = require('../../controllers/cases.controller');
const CasesValidator = require('../../validators/cases.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { writeChangeLogs } = require('../../middlewares/changeLog.middleware')(sequelize);
  const { verifyProjectDeveloperFromProjectId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  
  const Case = defineCase(sequelize, DataTypes);
  const casesController = new CasesController(sequelize, Case);

  router.post('/bulkdelete', 
    verifySignedIn, 
    writeChangeLogs, 
    verifyProjectDeveloperFromProjectId,
    CasesValidator.validateBulkDelete,
    (req, res) => casesController.deleteCases(req, res)
  );

  return router;
};
