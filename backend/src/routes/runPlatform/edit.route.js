const express = require('express');
const router = express.Router();

module.exports = function (sequelize) {
  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromRunId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.post('/', 
    verifySignedIn,
    verifyProjectDeveloperFromRunId,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateUpdateRunPlatforms,
    (req, res) => controller.updateRunPlatforms(req, res)
  );

  return router;
}; 