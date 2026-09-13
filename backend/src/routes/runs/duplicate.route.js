const express = require('express');
const router = express.Router();
const defineRun = require('../../models/runs.model');
const defineRunCase = require('../../models/runCases.model');
const { DataTypes } = require('sequelize');
const RunsController = require('../../controllers/runs.controller');
const RunsValidator = require('../../validators/runs.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromRunId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const Run = defineRun(sequelize, DataTypes);
  const RunCase = defineRunCase(sequelize, DataTypes);
  const runsController = new RunsController(sequelize, Run);

  router.post('/duplicate', 
    verifySignedIn, 
    verifyProjectDeveloperFromRunId,
    RunsValidator.sanitizeInput,
    RunsValidator.validateDuplicateRun,
    (req, res) => runsController.duplicateRun(req, res)
  );

  return router;
};
