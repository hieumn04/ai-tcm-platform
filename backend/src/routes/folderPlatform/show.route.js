const express = require('express');
const router = express.Router();

module.exports = function (sequelize) {
  const UtilitiesController = require('../../controllers/utilities.controller');
  const controller = new UtilitiesController(sequelize);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromFolderId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const UtilitiesValidator = require('../../validators/utilities.validator');

  router.get('/', 
    verifySignedIn,
    verifyProjectVisibleFromFolderId,
    UtilitiesValidator.sanitizeInput,
    UtilitiesValidator.validateGetFolderPlatforms,
    (req, res) => controller.getFolderPlatforms(req, res)
  );

  return router;
};
