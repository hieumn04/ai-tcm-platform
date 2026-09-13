const express = require('express');
const router = express.Router();
const defineProject = require('../../models/projects.model');
const { DataTypes } = require('sequelize');
const ProjectsController = require('../../controllers/projects.controller');
const ProjectsValidator = require('../../validators/projects.validator');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const Project = defineProject(sequelize, DataTypes);
  const projectsController = new ProjectsController(sequelize, Project);

  router.post('/', 
    verifySignedIn,
    ProjectsValidator.sanitizeInput,
    ProjectsValidator.validateCreateProject,
    (req, res) => projectsController.createProject(req, res)
  );

  return router;
};
