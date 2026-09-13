const express = require('express');
const router = express.Router();
const defineProject = require('../../models/projects.model');
const { DataTypes } = require('sequelize');
const ProjectsController = require('../../controllers/projects.controller');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const Project = defineProject(sequelize, DataTypes);
  const projectsController = new ProjectsController(sequelize, Project);

  router.get('/', 
    verifySignedIn,
    (req, res) => projectsController.listProjects(req, res)
  );

  return router;
};
