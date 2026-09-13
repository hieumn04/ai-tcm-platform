const express = require('express');
const router = express.Router();

module.exports = function (sequelize) {
  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromRunId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.get('/', 
    verifySignedIn,
    verifyProjectVisibleFromRunId,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateGetRunPlatforms,
    (req, res) => controller.getRunPlatforms(req, res)
  );

  return router;
};
