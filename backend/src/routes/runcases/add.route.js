const express = require('express');
const router = express.Router();
const defineRunCase = require('../../models/runCases.model');
const { DataTypes } = require('sequelize');

module.exports = function (sequelize) {
  const RunCase = defineRunCase(sequelize, DataTypes);
  const RunCasesController = require('../../controllers/runCases.controller');
  const controller = new RunCasesController(sequelize, RunCase);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromProjectId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const RunCasesValidator = require('../../validators/runCases.validator');

  router.post('/add', 
    verifySignedIn,
    verifyProjectDeveloperFromProjectId,
    RunCasesValidator.sanitizeInput,
    RunCasesValidator.validateAddCases,
    (req, res) => controller.addCasesToRun(req, res)
  );

  return router;
};
