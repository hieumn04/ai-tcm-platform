const express = require('express');

module.exports = function (sequelize) {
  const router = express.Router();
  
  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectReporterFromCaseId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const { writeChangeLogs } = require('../../middlewares/changeLog.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.post('/:caseId', 
    verifySignedIn,
    verifyProjectReporterFromCaseId,
    writeChangeLogs,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateCreateDevStatus,
    (req, res) => controller.createDevStatus(req, res)
  );

  return router;
};
