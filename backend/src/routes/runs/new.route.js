const express = require('express');
const router = express.Router();
const defineRun = require('../../models/runs.model');
const { DataTypes } = require('sequelize');
const RunsController = require('../../controllers/runs.controller');
const RunsValidator = require('../../validators/runs.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromProjectId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const Run = defineRun(sequelize, DataTypes);
  const runsController = new RunsController(sequelize, Run);

  router.post('/', 
    verifySignedIn, 
    verifyProjectDeveloperFromProjectId,
    RunsValidator.sanitizeInput,
    RunsValidator.validateCreateRun,
    (req, res) => runsController.createRun(req, res)
  );

  return router;
};
