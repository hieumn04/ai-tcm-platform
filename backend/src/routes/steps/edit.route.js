const express = require('express');
const router = express.Router();
const defineStep = require('../../models/steps.model');
const { DataTypes } = require('sequelize');

module.exports = function (sequelize) {
  const Step = defineStep(sequelize, DataTypes);
  const StepsController = require('../../controllers/steps.controller');
  const controller = new StepsController(sequelize, Step);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromCaseId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const StepsValidator = require('../../validators/steps.validator');

  router.post('/update', 
    verifySignedIn,
    verifyProjectDeveloperFromCaseId,
    StepsValidator.sanitizeInput,
    StepsValidator.validateUpdateSteps,
    (req, res) => controller.updateSteps(req, res)
  );

  return router;
};
