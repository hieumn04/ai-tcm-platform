const express = require('express');
const router = express.Router();
const defineFolder = require('../../models/folders.model');
const { DataTypes } = require('sequelize');
const FoldersController = require('../../controllers/folders.controller');
const FoldersValidator = require('../../validators/folders.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromFolderId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const { writeChangeLogs } = require('../../middlewares/changeLog.middleware')(sequelize);
  const Folder = defineFolder(sequelize, DataTypes);
  const foldersController = new FoldersController(sequelize, Folder);

  router.put('/:folderId', 
    verifySignedIn, 
    verifyProjectDeveloperFromFolderId, 
    writeChangeLogs,
    FoldersValidator.sanitizeInput,
    FoldersValidator.validateUpdateFolder,
    (req, res) => foldersController.updateFolder(req, res)
  );

  return router;
};
