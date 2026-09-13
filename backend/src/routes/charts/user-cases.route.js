const express = require('express');
const router = express.Router();

module.exports = function (sequelize) {
  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.get('/', 
    verifySignedIn,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateUserCasesChart,
    (req, res) => controller.getUserCasesChart(req, res)
  );

  return router;
};
