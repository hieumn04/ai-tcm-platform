const express = require('express');
const router = express.Router();
const defineRun = require('../../models/runs.model');
const { DataTypes } = require('sequelize');
const RunsController = require('../../controllers/runs.controller');
const RunsValidator = require('../../validators/runs.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromProjectId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const Run = defineRun(sequelize, DataTypes);
  const runsController = new RunsController(sequelize, Run);

  router.get('/', 
    verifySignedIn, 
    verifyProjectVisibleFromProjectId,
    RunsValidator.validateListRuns,
    (req, res) => runsController.listRuns(req, res)
  );

  return router;
};
