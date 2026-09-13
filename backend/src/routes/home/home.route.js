const express = require('express');
const router = express.Router();

module.exports = function (sequelize) {
  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromProjectId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.get('/:projectId', 
    verifySignedIn,
    verifyProjectVisibleFromProjectId,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateProjectDashboard,
    (req, res) => controller.getProjectDashboard(req, res)
  );
  
  return router;
};
