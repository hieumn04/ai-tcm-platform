const express = require('express');

module.exports = function (sequelize) {
  const router = express.Router();

  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectReporterFromCaseId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const { writeChangeLogs } = require('../../middlewares/changeLog.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.delete('/:caseId/:entryId', 
    verifySignedIn,
    verifyProjectReporterFromCaseId,
    writeChangeLogs,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateDeleteDevStatus,
    (req, res) => controller.deleteDevStatus(req, res)
  );

  return router;
};
