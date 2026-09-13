const express = require('express');

module.exports = function (sequelize) {
  const router = express.Router();

  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromCaseId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.get('/:caseId', 
    verifySignedIn,
    verifyProjectVisibleFromCaseId,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateGetDevStatuses,
    (req, res) => controller.getDevStatusesByCaseId(req, res)
  );

  return router;
};
