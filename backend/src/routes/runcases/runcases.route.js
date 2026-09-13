const express = require('express');
const router = express.Router();
const defineRunCase = require('../../models/runCases.model');
const { DataTypes } = require('sequelize');

module.exports = function (sequelize) {
  const RunCase = defineRunCase(sequelize, DataTypes);
  const RunCasesController = require('../../controllers/runCases.controller');
  const controller = new RunCasesController(sequelize, RunCase);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromRunId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const RunCasesValidator = require('../../validators/runCases.validator');

  router.get('/', 
    verifySignedIn,
    verifyProjectVisibleFromRunId,
    RunCasesValidator.sanitizeInput,
    RunCasesValidator.validateListRunCases,
    (req, res) => controller.listRunCases(req, res)
  );

  return router;
};
