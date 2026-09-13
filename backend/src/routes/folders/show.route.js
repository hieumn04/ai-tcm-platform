const express = require('express');
const router = express.Router();
const defineFolder = require('../../models/folders.model');
const { DataTypes } = require('sequelize');
const FoldersController = require('../../controllers/folders.controller');
const FoldersValidator = require('../../validators/folders.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromProjectId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const Folder = defineFolder(sequelize, DataTypes);
  const foldersController = new FoldersController(sequelize, Folder);

  // GET a specific folder within a project
  router.get('/:folderId', 
    verifySignedIn, 
    verifyProjectVisibleFromProjectId,
    FoldersValidator.validateShowFolder,
    (req, res) => foldersController.showFolder(req, res)
  );

  return router;
};
