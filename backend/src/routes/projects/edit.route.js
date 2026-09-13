const express = require('express');
const router = express.Router();
const defineProject = require('../../models/projects.model');
const { DataTypes } = require('sequelize');
const ProjectsController = require('../../controllers/projects.controller');
const ProjectsValidator = require('../../validators/projects.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectOwner } = require('../../middlewares/verifyEditable.middleware')(sequelize);
  const Project = defineProject(sequelize, DataTypes);
  const projectsController = new ProjectsController(sequelize, Project);

  router.put('/:projectId', 
    verifySignedIn, 
    verifyProjectOwner,
    ProjectsValidator.sanitizeInput,
    ProjectsValidator.validateUpdateProject,
    (req, res) => projectsController.updateProject(req, res)
  );

  return router;
};
