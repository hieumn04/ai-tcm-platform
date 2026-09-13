const express = require('express');
const router = express.Router();
const defineFolder = require('../../models/folders.model');
const { DataTypes } = require('sequelize');
const FoldersController = require('../../controllers/folders.controller');
const FoldersValidator = require('../../validators/folders.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectDeveloperFromProjectId } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const Folder = defineFolder(sequelize, DataTypes);
  const { writeChangeLogs } = require('../../middlewares/changeLog.middleware')(sequelize);
  const foldersController = new FoldersController(sequelize, Folder);

  router.post('/', 
    verifySignedIn, 
    verifyProjectDeveloperFromProjectId, 
    writeChangeLogs,
    FoldersValidator.sanitizeInput,
    FoldersValidator.validateCreateFolder,
    (req, res) => foldersController.createFolder(req, res)
  );

  return router;
};
