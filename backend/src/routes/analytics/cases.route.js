const express = require('express');
const router = express.Router();

module.exports = function (sequelize) {
  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.get('/cases', 
    verifySignedIn,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateCasesAnalytics,
    (req, res) => controller.getCasesAnalytics(req, res)
  );

  return router;
};
