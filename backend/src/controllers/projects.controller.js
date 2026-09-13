const ResponseUtil = require('../utils/response.util');

class ProjectsController {
  constructor(sequelize, Project) {
    this.sequelize = sequelize;
    this.Project = Project;
    this.setupAssociations();
  }

  setupAssociations() {
    const { DataTypes } = require('sequelize');
    const defineUser = require('../models/users.model');
    const defineMember = require('../models/members.model');
    const defineFolder = require('../models/folders.model');
    const defineRun = require('../models/runs.model');
    
    this.User = defineUser(this.sequelize, DataTypes);
    this.Member = defineMember(this.sequelize, DataTypes);
    this.Folder = defineFolder(this.sequelize, DataTypes);
    this.Run = defineRun(this.sequelize, DataTypes);
    
    // Set up associations properly
    this.Project.hasMany(this.Member, { foreignKey: 'projectId', as: 'members' });
    this.Member.belongsTo(this.Project, { foreignKey: 'projectId' });
    this.Project.hasMany(this.Folder, { foreignKey: 'projectId' });
    this.Folder.belongsTo(this.Project, { foreignKey: 'projectId' });
  }

  /**
   * Create new project
   */
  async createProject(req, res) {
    try {
      const { name, detail, isPublic } = req.body;
      
      const newProject = await this.Project.create({
        name,
        detail,
        isPublic,
        userId: req.userId,
      });

      ResponseUtil.created(res, newProject, 'Project created successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to create project');
    }
  }

  /**
   * Update existing project
   */
  async updateProject(req, res) {
    try {
      const { projectId } = req.params;
      const { name, detail, isPublic } = req.body;

      const project = await this.Project.findByPk(projectId);
      if (!project) {
        return ResponseUtil.notFound(res, 'Project not found');
      }

      await project.update({
        name,
        detail,
        isPublic,
      });

      ResponseUtil.success(res, project, 'Project updated successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to update project');
    }
  }

  /**
   * Delete project with related data
   */
  async deleteProject(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { projectId } = req.params;

      const project = await this.Project.findByPk(projectId);
      if (!project) {
        await transaction.rollback();
        return ResponseUtil.notFound(res, 'Project not found');
      }

      // Delete related data first
      await this.Folder.destroy({ where: { projectId: projectId }, transaction });
      await this.Run.destroy({ where: { projectId: projectId }, transaction });
      await project.destroy({ transaction });

      await transaction.commit();
      ResponseUtil.success(res, null, 'Project deleted successfully');
    } catch (error) {
      await transaction.rollback();
      ResponseUtil.serverError(res, error, 'Failed to delete project');
    }
  }

  /**
   * List projects for authenticated user
   */
  async listProjects(req, res) {
    try {
      const { roles } = require('../helpers/authSettings.helper');
      const { Op } = require('sequelize');

      const user = await this.User.findByPk(req.userId);
      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      // Admin gets all projects
      if (roles[user.role]?.uid === 'administrator') {
        const projects = await this.Project.findAll();
        return ResponseUtil.success(res, projects, 'Projects retrieved successfully');
      }

      let projects;

      if (req.query.onlyUserProjects === 'true') {
        projects = await this.Project.findAll({
          where: {
            [Op.or]: [
              { userId: req.userId },
              { '$members.userId$': req.userId }
            ],
          },
          include: [
            {
              model: this.Member,
              as: 'members',
              where: { userId: req.userId },
              required: false,
            },
          ],
        });
      } else {
        projects = await this.Project.findAll({
          where: {
            [Op.or]: [
              { userId: req.userId },
              { '$members.userId$': req.userId }
            ],
          },
          include: [
            {
              model: this.Member,
              as: 'members',
              required: false,
            },
          ],
        });
      }

      ResponseUtil.success(res, projects, 'Projects retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve projects');
    }
  }

  /**
   * Get project details with folders
   */
  async showProject(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return ResponseUtil.validationError(res, ['Project ID is required']);
      }

      const project = await this.Project.findByPk(projectId, {
        include: [
          {
            model: this.Folder,
          },
        ],
      });

      if (!project) {
        return ResponseUtil.notFound(res, 'Project not found');
      }

      ResponseUtil.success(res, project, 'Project retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve project');
    }
  }
}

module.exports = ProjectsController; 