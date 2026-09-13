const express = require('express');
const router = express.Router();
const defineRun = require('../../models/runs.model');
const defineRunCase = require('../../models/runCases.model');
const defineRunCaseStatus = require('../../models/runCaseStatus.model'); // Import RunCaseStatus
const { DataTypes, literal } = require('sequelize');
const RunsController = require('../../controllers/runs.controller');
const RunsValidator = require('../../validators/runs.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromRunId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const Run = defineRun(sequelize, DataTypes);
  const RunCase = defineRunCase(sequelize, DataTypes);
  const RunCaseStatus = defineRunCaseStatus(sequelize, DataTypes); // Define RunCaseStatus

  RunCase.hasMany(RunCaseStatus, { foreignKey: 'runCaseId', as: 'statuses', onDelete: 'CASCADE' });
  RunCaseStatus.belongsTo(RunCase, { foreignKey: 'runCaseId', onDelete: 'CASCADE' });
  
  const runsController = new RunsController(sequelize, Run);

  router.get('/:runId', 
    verifySignedIn, 
    verifyProjectVisibleFromRunId,
    RunsValidator.validateShowRun,
    (req, res) => runsController.showRun(req, res)
  );

  return router;
};
