const express = require('express');
const router = express.Router();
const defineProject = require('../../models/projects.model');
const { DataTypes } = require('sequelize');
const ProjectsController = require('../../controllers/projects.controller');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromProjectId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  const Project = defineProject(sequelize, DataTypes);
  const projectsController = new ProjectsController(sequelize, Project);

  router.get('/:projectId', 
    verifySignedIn, 
    verifyProjectVisibleFromProjectId, 
    (req, res) => projectsController.showProject(req, res)
  );

  return router;
};
