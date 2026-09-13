const express = require('express');
const router = express.Router();
const defineProject = require('../../models/projects.model');
const { DataTypes } = require('sequelize');
const ProjectsController = require('../../controllers/projects.controller');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectOwner } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const Project = defineProject(sequelize, DataTypes);
  const projectsController = new ProjectsController(sequelize, Project);

  router.delete('/:projectId', 
    verifySignedIn, 
    verifyProjectOwner, 
    (req, res) => projectsController.deleteProject(req, res)
  );

  return router;
};
