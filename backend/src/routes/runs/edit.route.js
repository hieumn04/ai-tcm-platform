const express = require('express');
const router = express.Router();
const defineRun = require('../../models/runs.model');
const { DataTypes } = require('sequelize');
const RunsController = require('../../controllers/runs.controller');
const RunsValidator = require('../../validators/runs.validator');

module.exports = function (sequelize) {
  const Run = defineRun(sequelize, DataTypes);
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromRunId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const runsController = new RunsController(sequelize, Run);

  router.put('/:runId', 
    verifySignedIn, 
    verifyProjectDeveloperFromRunId,
    RunsValidator.sanitizeInput,
    RunsValidator.validateUpdateRun,
    (req, res) => runsController.updateRun(req, res)
  );

  return router;
};
