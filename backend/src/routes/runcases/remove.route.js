const express = require('express');
const router = express.Router();
const defineRunCase = require('../../models/runCases.model');
const { DataTypes } = require('sequelize');

module.exports = function (sequelize) {
  const RunCase = defineRunCase(sequelize, DataTypes);
  const RunCasesController = require('../../controllers/runCases.controller');
  const controller = new RunCasesController(sequelize, RunCase);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromRunId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const RunCasesValidator = require('../../validators/runCases.validator');

  router.post('/remove', 
    verifySignedIn,
    verifyProjectDeveloperFromRunId,
    RunCasesValidator.sanitizeInput,
    RunCasesValidator.validateRemoveCases,
    (req, res) => controller.removeCasesFromRun(req, res)
  );

  return router;
};
