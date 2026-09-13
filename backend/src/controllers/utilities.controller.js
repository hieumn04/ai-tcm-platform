const { DataTypes, Op, QueryTypes } = require('sequelize');
const ResponseUtil = require('../utils/response.util');

class UtilitiesController {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.initializeModels();
    this.setupAssociations();
  }

  initializeModels() {
    this.Project = require('../models/projects.model')(this.sequelize, DataTypes);
    this.Folder = require('../models/folders.model')(this.sequelize, DataTypes);
    this.Case = require('../models/cases.model')(this.sequelize, DataTypes);
    this.Run = require('../models/runs.model')(this.sequelize, DataTypes);
    this.RunCase = require('../models/runCases.model')(this.sequelize, DataTypes);
    this.DevStatus = require('../models/devStatus.model')(this.sequelize, DataTypes);
    this.ChangeLogs = require('../models/changeLogs.model')(this.sequelize, DataTypes);
    this.User = require('../models/users.model')(this.sequelize, DataTypes);
    this.PlatformStatus = require('../models/platformStatus.model')(this.sequelize, DataTypes);
    this.RunPlatform = require('../models/runPlatforms.model')(this.sequelize, DataTypes);
    this.RunCaseStatus = require('../models/runCaseStatus.model')(this.sequelize, DataTypes);
    this.FolderPlatform = require('../models/folderPlatforms.model')(this.sequelize, DataTypes);
  }

  setupAssociations() {
    this.Project.hasMany(this.Folder, { foreignKey: 'projectId' });
    this.Project.hasMany(this.Run, { foreignKey: 'projectId' });
    this.Folder.hasMany(this.Case, { foreignKey: 'folderId' });
    this.Folder.belongsTo(this.Project, { foreignKey: 'projectId' });
    this.Run.hasMany(this.RunCase, { foreignKey: 'runId' });
    this.Case.hasMany(this.DevStatus, { foreignKey: 'caseId', as: 'devStatuses' });
    this.DevStatus.belongsTo(this.Case, { foreignKey: 'caseId' });
    this.DevStatus.belongsTo(this.User, { foreignKey: 'createdBy', as: 'creator' });
    this.DevStatus.belongsTo(this.User, { foreignKey: 'updatedBy', as: 'updater' });
    this.RunPlatform.belongsTo(this.Run, { foreignKey: 'runId' });
    this.RunPlatform.belongsTo(this.PlatformStatus, { foreignKey: 'platformId' });
    this.Folder.hasMany(this.FolderPlatform, { foreignKey: 'folderId' });
    this.FolderPlatform.belongsTo(this.Folder, { foreignKey: 'folderId' });
    this.FolderPlatform.belongsTo(this.PlatformStatus, { foreignKey: 'platformId' });
  }

  // HOME DASHBOARD
  async getProjectDashboard(req, res) {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        return ResponseUtil.validationError(res, ['projectId is required']);
      }
      
      const project = await this.Project.findByPk(projectId);
      if (!project) {
        return ResponseUtil.notFound(res, 'Project not found');
      }
      
      const [folderCount, runCount, caseCount, runCaseCount, aiCasesCount] = await Promise.all([
        this.Folder.count({ where: { projectId } }),
        this.Run.count({ where: { projectId } }),
        this.Case.count({
          where: {
            folderId: {
              [Op.in]: this.sequelize.literal(`(SELECT id FROM "folders" WHERE "projectId" = ${projectId})`)
            },
            is_deleted: false
          }
        }),
        this.RunCase.count({
          where: {
            runId: {
              [Op.in]: this.sequelize.literal(`(SELECT id FROM "runs" WHERE "projectId" = ${projectId})`)
            },
            is_deleted: false
          }
        }),
        this.Case.count({
          where: {
            folderId: {
              [Op.in]: this.sequelize.literal(`(SELECT id FROM "folders" WHERE "projectId" = ${projectId})`),
            },
            useAI: true,
            is_deleted: false,
          },
        })
      ]);
      
      return ResponseUtil.success(res, {
        ...project.toJSON(),
        folderCount,
        caseCount,
        runCount,
        runCaseCount,
        aiCasesCount,
      }, 'Project dashboard retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to fetch project dashboard');
    }
  }

  // CHARTS & ANALYTICS
  async getUserCasesChart(req, res) {
    try {
      const userEmail = req.query.email || '';
      const startDateParam = req.query.startDate;
      const endDateParam = req.query.endDate;
      
      // If no email provided, return empty data
      if (!userEmail) {
        return ResponseUtil.success(res, {
          chartData: {
            labels: [],
            datasets: [],
          },
        }, 'Chart data retrieved successfully (no email provided)');
      }

      // Check if user exists
      const user = await this.User.findOne({
        where: { email: userEmail }
      });

      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      // Calculate date range - use provided dates or default to last 30 days
      let startDate, endDate;
      
      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        // Ensure endDate includes the entire day
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
      }

      // Validate date range
      if (startDate > endDate) {
        return ResponseUtil.validationError(res, ['Start date cannot be after end date']);
      }

      // Query to get user case activity data with dynamic date range
      const results = await this.sequelize.query(
        `SELECT
          rcs."updatedAt"::DATE AS day,
          u.email,
          COUNT(DISTINCT rc."caseId") AS "num_of_cases",
          r.id AS "runId",
          r.description
        FROM "runCaseStatuses" rcs
        INNER JOIN users u ON rcs."userId" = u.id
        INNER JOIN "runCases" rc ON rcs."runCaseId" = rc.id
        INNER JOIN runs r ON rc."runId" = r.id
        WHERE u.email = :userEmail
          AND rcs."updatedAt"::DATE >= :startDate
          AND rcs."updatedAt"::DATE <= :endDate
        GROUP BY rcs."updatedAt"::DATE, u.email, r.id, r.description
        ORDER BY rcs."updatedAt"::DATE DESC`,
        {
          type: QueryTypes.SELECT,
          replacements: { 
            userEmail: userEmail,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          },
        }
      );
      // Generate a complete date range for the selected period
      const dateLabels = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dateLabels.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Process the data for the frontend chart
      const processedData = {
        labels: dateLabels.sort(),
        datasets: /** @type {Array<{label: string, data: number[]}>} */ ([]),
      };

      // Create dataset for the user
      if (results.length > 0) {
        // Aggregate cases by date for this user
        const aggregatedData = {};
        results.forEach(item => {
          const date = item.day;
          if (!aggregatedData[date]) {
            aggregatedData[date] = 0;
          }
          aggregatedData[date] += parseInt(item.num_of_cases, 10);
        });

        const userData = {
          label: `${userEmail} - Cases Updated`,
          data: dateLabels.map((date) => {
            return aggregatedData[date] || 0;
          }),
        } ;

        processedData.datasets = [userData];

      } else {
        // User exists but no activity data
        const userData = {
          label: `${userEmail} - Cases Updated`,
          data: dateLabels.map(() => 0),
        };

        processedData.datasets = [userData];
      }

      return ResponseUtil.success(res, { 
        chartData: processedData,
        userInfo: {
          email: userEmail,
          totalActiveDays: results.length,
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          }
        }
      }, 'User cases chart data retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to fetch user cases chart data');
    }
  }

  async getCasesAnalytics(req, res) {
    try {
      const { projectId } = req.query;
      
      if (!projectId) {
        return ResponseUtil.validationError(res, ['projectId is required']);
      }
      
      const results = await this.sequelize.query(
        `SELECT 
          c.priority,
          c.type,
          COUNT(*) as count
        FROM cases c
        INNER JOIN folders f ON c."folderId" = f.id
        WHERE f."projectId" = :projectId AND c.is_deleted = false
        GROUP BY c.priority, c.type
        ORDER BY c.priority, c.type`,
        {
          replacements: { projectId },
          type: QueryTypes.SELECT
        }
      );
      
      return ResponseUtil.success(res, results, 'Analytics data retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to fetch analytics data');
    }
  }

  // DEV STATUS MANAGEMENT
  async createDevStatus(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { case_id, role, status } = req.body;
      const created_by = req.userId;
      
      if (!case_id || !role || !status || !created_by) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['case_id, role, status, and userId are required']);
      }
      
      // Check if dev status already exists for this case and role
      const existingStatus = await this.DevStatus.findOne({
        where: { caseId: case_id, role },
        transaction,
      });
      
      if (existingStatus) {
        // Update existing status
        await existingStatus.update({
          status,
          updatedBy: created_by,
          updatedAt: new Date(),
        }, { transaction });
        
        await transaction.commit();
        return ResponseUtil.success(res, existingStatus, 'Dev status updated successfully');
      } else {
        // Create new status
        const newDevStatus = await this.DevStatus.create({
          caseId: case_id,
          role,
          status,
          createdBy: created_by,
          updatedBy: created_by,
        }, { transaction });
        
        await transaction.commit();
        return ResponseUtil.created(res, newDevStatus, 'Dev status created successfully');
      }
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to create dev status');
    }
  }

  async getDevStatusesByCaseId(req, res) {
    try {
      const { caseId } = req.params;
      
      if (!caseId) {
        return ResponseUtil.validationError(res, ['caseId is required']);
      }
      
      const devStatuses = await this.DevStatus.findAll({
        where: { caseId: caseId },
        include: [
          { model: this.User, as: 'creator', attributes: ['id', 'username', 'email'] },
          { model: this.User, as: 'updater', attributes: ['id', 'username', 'email'] },
        ],
        order: [['createdAt', 'DESC']],
      });
      
      return ResponseUtil.success(res, devStatuses, 'Dev statuses retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to fetch dev statuses');
    }
  }

  async deleteDevStatus(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { devStatusId } = req.params;
      
      if (!devStatusId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['devStatusId is required']);
      }
      
      const devStatus = await this.DevStatus.findByPk(devStatusId, { transaction });
      if (!devStatus) {
        await transaction.rollback();
        return ResponseUtil.notFound(res, 'Dev status not found');
      }
      
      await devStatus.destroy({ transaction });
      await transaction.commit();
      
      return ResponseUtil.success(res, null, 'Dev status deleted successfully');
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to delete dev status');
    }
  }

  // CHANGE LOGS
  async getChangeLogsByCaseId(req, res) {
    try {
      const { caseId } = req.params;
      
      if (!caseId) {
        return ResponseUtil.validationError(res, ['caseId is required']);
      }
      
      const changeLogs = await this.ChangeLogs.findAll({
        where: { case_id: caseId },
        order: [['action_at', 'ASC']],
        attributes: ['id', 'content', 'endpoint', 'action_at', 'author'],
      });
      
      const results = changeLogs.reduce((acc, log) => {
        if (log.endpoint.includes('/api/dev-status')) return acc;
        
        let content;
        try {
          content = JSON.parse(log.content);
        } catch (error) {
            return acc; // Skip invalid logs
        }
        
        const previousContent = acc.length > 0 ? JSON.parse(acc[acc.length - 1].rawContent) : {};
        const changes = this.detectChanges(previousContent, content);
        
        if (changes) {
          acc.push({
            time: log.action_at,
            author: log.author,
            content: changes,
            rawContent: log.content,
          });
        }
        
        return acc;
      }, []);
      
      results.sort((a, b) => new Date(b.time)?.getTime() - new Date(a.time)?.getTime());
      
      return ResponseUtil.success(res, results, 'Change logs retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to fetch change logs');
    }
  }

  // RUN PLATFORM MANAGEMENT
  async getRunPlatforms(req, res) {
    try {
      // Get runId from query params, body, or params
      const runId = req.query.runId || req.body?.runId || req.params?.runId;
      
      if (!runId) {
        return ResponseUtil.validationError(res, ['runId is required']);
      }
      
      const [allPlatforms, runPlatforms] = await Promise.all([
        this.PlatformStatus.findAll(),
        this.RunPlatform.findAll({
          where: { runId },
          attributes: ['platformId'],
        })
      ]);
      
      const includedPlatformIds = new Set(runPlatforms.map((rp) => rp.platformId));
      
      const response = allPlatforms.map((platform) => ({
        id: platform.id,
        platform: platform.platform,
        isInclude: includedPlatformIds.has(platform.id),
      }));
      
      return ResponseUtil.success(res, response, 'Platform statuses retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to fetch platform statuses');
    }
  }

  async updateRunPlatforms(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Get runId from query params, body, or params
      const runId = req.query.runId || req.body?.runId || req.params?.runId;
      const { platformIds = [], platformId, isInclude } = req.body || {};
      
      if (!runId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['runId is required']);
      }
      
      // Handle single platform update (like folder platforms)
      if (platformId !== undefined && isInclude !== undefined) {
        const existingRecord = await this.RunPlatform.findOne({
          where: { runId, platformId },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });
        
        if (isInclude) {
          if (!existingRecord) {
            const newRecord = await this.RunPlatform.create(
              { runId: parseInt(runId, 10), platformId },
              { transaction }
            );
            await transaction.commit();
            return ResponseUtil.created(res, newRecord, 'Run platform added successfully');
          }
          await transaction.commit();
          return ResponseUtil.success(res, null, 'Run platform already exists');
        } else {
          if (existingRecord) {
            await existingRecord.destroy({ transaction });
            await transaction.commit();
            return ResponseUtil.success(res, null, 'Run platform removed successfully');
          }
          await transaction.commit();
          return ResponseUtil.notFound(res, 'Run platform not found');
        }
      }
      
      // Handle bulk platform update (original functionality)
      if (!Array.isArray(platformIds)) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['platformIds must be an array']);
      }
      
      // Remove existing run platforms
      await this.RunPlatform.destroy({
        where: { runId },
        transaction,
      });
      
      // Add new run platforms
      if (platformIds.length > 0) {
        const runPlatformData = platformIds.map(platformId => ({
          runId: parseInt(runId, 10),
          platformId,
        }));
        
        await this.RunPlatform.bulkCreate(runPlatformData, { transaction });
      }
      
      await transaction.commit();
      
      return ResponseUtil.success(res, { updated: platformIds.length }, 'Run platforms updated successfully');
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to update run platforms');
    }
  }

  // FOLDER PLATFORM MANAGEMENT
  async getFolderPlatforms(req, res) {
    try {
      const { folderId } = req.query;
      
      if (!folderId) {
        return ResponseUtil.validationError(res, ['folderId is required']);
      }
      
      const [allPlatforms, folderPlatforms] = await Promise.all([
        this.PlatformStatus.findAll(),
        this.FolderPlatform.findAll({
          where: { folderId },
          attributes: ['platformId'],
        })
      ]);
      
      const includedPlatformIds = new Set(folderPlatforms.map((fp) => fp.platformId));
      
      const response = allPlatforms.map((platform) => ({
        id: platform.id,
        platform: platform.platform,
        isInclude: includedPlatformIds.has(platform.id),
      }));
      
      return ResponseUtil.success(res, response, 'Folder platform statuses retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to fetch folder platform statuses');
    }
  }

  async updateFolderPlatforms(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { folderId, platformId, isInclude } = req.body;
      
      if (!folderId || !platformId || isInclude === undefined) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['folderId, platformId, and isInclude are required']);
      }
      
      const existingRecord = await this.FolderPlatform.findOne({
        where: { folderId, platformId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      
      if (isInclude) {
        if (!existingRecord) {
          const newRecord = await this.FolderPlatform.create(
            { folderId, platformId },
            { transaction }
          );
          await transaction.commit();
          return ResponseUtil.created(res, newRecord, 'Folder platform added successfully');
        }
        await transaction.commit();
        return ResponseUtil.success(res, null, 'Folder platform already exists');
      } else {
        if (existingRecord) {
          await existingRecord.destroy({ transaction });
          await transaction.commit();
          return ResponseUtil.success(res, null, 'Folder platform removed successfully');
        }
        await transaction.commit();
        return ResponseUtil.notFound(res, 'Folder platform not found');
      }
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to update folder platforms');
    }
  }

  // HELPER METHODS
  detectChanges(previousContent, currentContent) {
    const changes = {};
    
    for (const key in currentContent) {
      if (currentContent[key] !== previousContent[key]) {
        changes[key] = {
          old: previousContent[key],
          new: currentContent[key],
        };
      }
    }
    
    return Object.keys(changes).length > 0 ? changes : null;
  }
}

module.exports = UtilitiesController; 