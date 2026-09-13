const ResponseUtil = require('../utils/response.util');

class MembersController {
  constructor(sequelize, Member) {
    this.sequelize = sequelize;
    this.Member = Member;
    this.setupAssociations();
  }

  setupAssociations() {
    const { DataTypes } = require('sequelize');
    const defineUser = require('../models/users.model');
    const defineProject = require('../models/projects.model');
    
    this.User = defineUser(this.sequelize, DataTypes);
    this.Project = defineProject(this.sequelize, DataTypes);
    
    // Set up associations properly
    this.Member.belongsTo(this.User, { foreignKey: 'userId' });
  }

  /**
   * Add new member to project
   */
  async addMember(req, res) {
    try {
      const { userId, projectId } = req.query;
      const { memberRoles } = require('../helpers/authSettings.helper');

      // Check if the record already exists
      const existingMember = await this.Member.findOne({
        where: { userId, projectId },
      });

      if (existingMember) {
        return ResponseUtil.validationError(res, ['Member already exists in this project']);
      }

      const managerRoleIndex = memberRoles.findIndex((entry) => entry.uid === 'developer');
      const newMember = await this.Member.create({
        userId,
        projectId,
        role: managerRoleIndex,
      });

      ResponseUtil.created(res, newMember, 'Member added successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to add member');
    }
  }

  /**
   * Update member role
   */
  async updateMember(req, res) {
    try {
      const { userId, projectId, role } = req.query;

      const member = await this.Member.findOne({
        where: { userId, projectId },
      });

      if (!member) {
        return ResponseUtil.notFound(res, 'Member not found');
      }

      await member.update({ userId, projectId, role });
      ResponseUtil.success(res, member, 'Member updated successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to update member');
    }
  }

  /**
   * Remove member from project
   */
  async deleteMember(req, res) {
    try {
      const { userId, projectId } = req.query;

      const deletingMember = await this.Member.findOne({
        where: { userId, projectId },
      });

      if (!deletingMember) {
        return ResponseUtil.notFound(res, 'Member not found');
      }

      await deletingMember.destroy();
      ResponseUtil.noContent(res);
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to delete member');
    }
  }

  /**
   * List project members
   */
  async listMembers(req, res) {
    try {
      const { projectId } = req.query;

      const members = await this.Member.findAll({
        where: { projectId },
        include: [{ model: this.User }],
      });

      ResponseUtil.success(res, members, 'Members retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve members');
    }
  }

  /**
   * Check user's project memberships and roles
   */
  async checkMemberPermissions(req, res) {
    try {
      const userId = req.userId;

      // Get user's memberships
      const members = await this.Member.findAll({
        where: { userId },
      });

      // Get user's owned projects
      const myProjects = await this.Project.findAll({
        where: { userId },
      });

      // Map member roles
      const projectRoles = members.map((member) => ({
        projectId: member.projectId,
        isOwner: false,
        isMember: true,
        role: member.role,
      }));

      // Map owned project roles
      const ownProjectRoles = myProjects.map((project) => ({
        projectId: project.id,
        isOwner: true,
        isMember: true,
        role: 0, // Owner role
      }));

      const allRoles = [...projectRoles, ...ownProjectRoles];
      ResponseUtil.success(res, allRoles, 'Member permissions retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to check member permissions');
    }
  }
}

module.exports = MembersController; 