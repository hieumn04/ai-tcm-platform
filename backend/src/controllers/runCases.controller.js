const { DataTypes, Op } = require('sequelize');
const ResponseUtil = require('../utils/response.util');

class RunCasesController {
  constructor(sequelize, RunCase, webSocketService) {
    this.sequelize = sequelize;
    this.RunCase = RunCase;
    this.webSocketService = webSocketService;
    this.Case = require('../models/cases.model')(sequelize, DataTypes);
    this.Run = require('../models/runs.model')(sequelize, DataTypes);
    this.RunCaseStatus = require('../models/runCaseStatus.model')(sequelize, DataTypes);
    this.PlatformStatus = require('../models/platformStatus.model')(sequelize, DataTypes);
    this.DevStatus = require('../models/devStatus.model')(sequelize, DataTypes);
    this.User = require('../models/users.model')(sequelize, DataTypes);
    this.Folder = require('../models/folders.model')(sequelize, DataTypes);
    this.Project = require('../models/projects.model')(sequelize, DataTypes);
    this.PlatformEvidence = require('../models/platformEvidence.model')(sequelize, DataTypes);
    this.setupAssociations();
  }

  setupAssociations() {
    this.Project.hasMany(this.Folder, { foreignKey: 'projectId' });
    this.Folder.hasMany(this.Case, { foreignKey: 'folderId' });
    this.Folder.belongsTo(this.Project, { foreignKey: 'projectId' });
    this.Case.belongsTo(this.Folder, { foreignKey: 'folderId' });
    this.Case.hasMany(this.RunCase, { foreignKey: 'caseId' });
    this.Case.hasMany(this.DevStatus, { foreignKey: 'case_id', as: 'devStatuses' });
    this.Case.hasMany(this.PlatformEvidence, { foreignKey: 'case_id', as: 'platformEvidences' });
    this.RunCase.belongsTo(this.Case, { foreignKey: 'caseId' });
    this.Run.hasMany(this.RunCase, { foreignKey: 'runId' });
    this.RunCase.belongsTo(this.Run, { foreignKey: 'runId' });
    this.RunCase.hasMany(this.RunCaseStatus, { foreignKey: 'runCaseId', as: 'statuses', onDelete: 'CASCADE' });
    this.RunCaseStatus.belongsTo(this.RunCase, { foreignKey: 'runCaseId', onDelete: 'CASCADE' });
    this.RunCaseStatus.belongsTo(this.PlatformStatus, { foreignKey: 'platformId', onDelete: 'CASCADE' });
    this.RunCaseStatus.belongsTo(this.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
    this.DevStatus.belongsTo(this.Case, { foreignKey: 'case_id' });
    this.DevStatus.belongsTo(this.User, { foreignKey: 'created_by', as: 'creator' });
  }

  async addCasesToRun(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { runId, projectId } = req.query;
      const { caseIds, customRunName, selectAllPages, folderId, description } = req.body;
      
      let finalRunId = runId;
      let caseIdsToAdd = caseIds;
      
      if (selectAllPages) {
        if (!folderId) {
          await transaction.rollback();
          return ResponseUtil.validationError(res, ['Folder ID is required when selecting all cases']);
        }
        
        const allCases = await this.Case.findAll({
          where: { folderId, is_deleted: false },
          attributes: ['id'],
          transaction,
        });
        
        caseIdsToAdd = allCases.map(c => c.id);
      }
      
      if (!Array.isArray(caseIdsToAdd) || caseIdsToAdd.length === 0) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['No valid cases found to add']);
      }
      
      if (!runId) {
        if (!customRunName || !projectId) {
          await transaction.rollback();
          return ResponseUtil.validationError(res, ['customRunName and projectId are required when creating a new run']);
        }
        
        const newRun = await this.Run.create({
          name: customRunName,
          configurations: 0,
          description: description,
          state: 0,
          projectId,
        }, { transaction });
        
        finalRunId = newRun.id;
      }
      
      const existingRunCases = await this.RunCase.findAll({
        where: { runId: finalRunId, caseId: { [Op.in]: caseIdsToAdd }, is_deleted: false },
        attributes: ['caseId'],
        transaction,
      });
      
      const existingCaseIds = new Set(existingRunCases.map(rc => rc.caseId));
      const newCaseIds = caseIdsToAdd.filter(caseId => !existingCaseIds.has(caseId));
      
      if (newCaseIds.length > 0) {
        await this.RunCase.bulkCreate(
          newCaseIds.map(caseId => ({ runId: finalRunId, caseId })),
          { transaction }
        );
      }
      
      await transaction.commit();
      
      return ResponseUtil.success(res, {
        runId: finalRunId,
        added: newCaseIds.length,
        duplicate: caseIdsToAdd.length - newCaseIds.length,
      }, 'Cases added to run successfully');
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to add cases to run');
    }
  }

  async updateRunCaseStatuses(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const runId = req.query.runId;
      const { runCases } = req.body;
      const userId = req.userId;
      
      if (!runId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['runId is required']);
      }
      
      if (!runCases || !Array.isArray(runCases)) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['runCases must be a non-empty array']);
      }
      
      if (!userId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['User ID not found in request']);
      }
      
      const existingRunCases = await this.RunCase.findAll({
        where: { runId, is_deleted: false },
        transaction,
      });
      
      if (existingRunCases.length === 0) {
        await transaction.rollback();
        return ResponseUtil.notFound(res, 'No run cases found for the specified runId');
      }
      
      const existingRunCaseMap = new Map(existingRunCases.map(rc => [rc.caseId, rc]));
      const allPlatformNames = [...new Set(runCases.flatMap(rc => (rc.statuses || []).map(s => s.platform)))];
      const platformMap = await this.validatePlatforms(allPlatformNames, transaction);
      
      let processedCount = 0;
      let skippedCount = 0;
      const updatedCases = [];
      
      for (const runCase of runCases) {
        if (!runCase.caseId) {
          skippedCount++;
          continue;
        }
        
        const currentRunCase = existingRunCaseMap.get(runCase.caseId);
        if (!currentRunCase) {
          skippedCount++;
          continue;
        }
        
        const newStatuses = runCase.statuses || [];
        await this.updateRunCaseStatusesForCase(currentRunCase, newStatuses, platformMap, userId, transaction);
        processedCount++;

        updatedCases.push({
          runCaseId: currentRunCase.id,
          caseId: runCase.caseId,
          statuses: newStatuses.map(s => ({
            platform: s.platform,
            status: s.status,
            userId: userId,
          })),
        });
      }
      
      await transaction.commit();

      // Point 1 & 4: Broadcast delta updates ONLY after commit succeeds
      if (this.webSocketService && updatedCases.length > 0) {
        try {
          this.webSocketService.broadcastCaseStatusUpdated(runId, {
            runId: Number(runId),
            updatedBy: userId,
            updatedCases,
          });
        } catch (wsError) {
          console.error('[RunCasesController] WebSocket broadcast error:', wsError);
        }
      }
      
      return ResponseUtil.success(res, {
        processed: processedCount,
        skipped: skippedCount,
      }, 'RunCase statuses updated successfully');
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to update run case statuses');
    }
  }

  async removeCasesFromRun(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { runId } = req.query;
      const { caseIds, runCaseIds } = req.body;
      
      if (!runId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['runId is required']);
      }
      
      let deletedCount;
      
      if (runCaseIds && Array.isArray(runCaseIds) && runCaseIds.length > 0) {
        const [updatedCount] = await this.RunCase.update(
          { is_deleted: true },
          {
            where: {
              id: { [Op.in]: runCaseIds },
              runId: runId,
              is_deleted: false,
            },
            transaction,
          }
        );
        deletedCount = updatedCount;
      } else if (caseIds && Array.isArray(caseIds) && caseIds.length > 0) {
        const [updatedCount] = await this.RunCase.update(
          { is_deleted: true },
          {
            where: {
              runId: runId,
              caseId: { [Op.in]: caseIds },
              is_deleted: false,
            },
            transaction,
          }
        );
        deletedCount = updatedCount;
      } else {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['Either caseIds or runCaseIds must be a non-empty array']);
      }
      
      await transaction.commit();
      
      return ResponseUtil.success(res, {
        removed: deletedCount,
      }, 'Cases removed from run successfully');
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to remove cases from run');
    }
  }

  async listRunCases(req, res) {
    try {
      const { runId } = req.query;
      
      if (!runId) {
        return ResponseUtil.validationError(res, ['runId is required']);
      }
      
      const runCases = await this.RunCase.findAll({
        where: { runId, is_deleted: false },
        attributes: { exclude: ['is_deleted'] },
        include: [
          {
            model: this.Case,
            attributes: { exclude: ['is_deleted'] },
          },
        ],
        order: [['createdAt', 'DESC']],
      });
      
      return ResponseUtil.success(res, runCases, 'Run cases retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to retrieve run cases');
    }
  }

  async getRunCasesByRunId(req, res) {
    try {
      const { runId } = req.query;
      const { page = 1, limit = 25, search, sortColumn = '', sortDirection = 'ASC' } = req.query;
      
      if (!runId) {
        return ResponseUtil.validationError(res, ['runId is required']);
      }
      
      const caseWhereClause = search ? {
        [Op.or]: [
          { description: { [Op.iLike]: `%${search}%` } },
          { title: { [Op.iLike]: `%${search}%` } },
          { customId: { [Op.iLike]: `%${search}%` } },
        ],
      } : {};
      
      const totalRunCases = await this.RunCase.count({ where: { runId, is_deleted: false } });
      
      let order;
      try {
        order = this.buildAdvancedSortOrder(sortColumn, sortDirection);
      } catch (sortError) {
        order = [['createdAt', 'DESC']];
      }
      
      const queryOptions = {
        where: { runId, is_deleted: false },
        attributes: { exclude: ['is_deleted'] },
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        include: [
          {
            model: this.Case,
            where: caseWhereClause,
            attributes: { exclude: ['is_deleted'] },
            include: [
              {
                model: this.DevStatus,
                as: 'devStatuses',
                attributes: ['case_id', 'status'],
                required: false,
              },
              {
                model: this.PlatformEvidence,
                as: 'platformEvidences',
                attributes: ['id', 'platform', 'evidenceImageUrls', 'evidenceDescription'],
                required: false,
              },
            ],
          },
          {
            model: this.RunCaseStatus,
            as: 'statuses',
            required: false,
            include: [
              {
                model: this.PlatformStatus,
                attributes: ['id', 'platform'],
              },
            ],
          },
        ],
        order,
        subQuery: false,
      };
      
      let result;
      try {
        result = await this.RunCase.findAndCountAll(queryOptions);
      } catch (queryError) {
        queryOptions.order = sortColumn === 'caseId' ? [[this.Case, 'customId', sortDirection]] : [['createdAt', 'DESC']];
        result = await this.RunCase.findAndCountAll(queryOptions);
      }
      
      const formattedRunCases = result.rows.map((runCase) => {
        const rawCase = runCase.Case ? runCase.Case.toJSON() : {};

        const devStatuses = (rawCase.devStatuses || []).map(ds => ({
          caseId: ds.case_id,
          status: ds.status,
        }));

        const platformEvidences = (rawCase.platformEvidences || []).map(pe => ({
          id: pe.id,
          platform: pe.platform,
          evidenceImageUrls: pe.evidenceImageUrls,
          evidenceDescription: pe.evidenceDescription,
        }));

        const testCaseStatus = this.deriveTestCaseStatus(devStatuses);

        const evidenceByPlatform = platformEvidences.reduce((acc, evidence) => {
          if (evidence.platform) {
            acc[evidence.platform] = evidence;
          }
          return acc;
        }, {});

        const formattedCase = {
          ...rawCase,
          devStatuses,
          platformEvidences,
          evidenceByPlatform,
        };
        delete formattedCase.Case;

        const runCaseData = runCase.toJSON();
        delete runCaseData.is_deleted;

        return {
          ...runCaseData,
          testCaseStatus,
          page: Number(page),
          limit: Number(limit),
          statuses: runCase.statuses,
        };
      });
      
      return ResponseUtil.success(res, {
        runCases: formattedRunCases,
        totalRunCases,
        filteredTotal: result.count,
        totalPages: Math.ceil(result.count / Number(limit)),
        page: Number(page),
        limit: Number(limit),
        ...(sortColumn ? { sortColumn, sortDirection } : {}),
      }, 'Run cases retrieved successfully');
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to retrieve run cases');
    }
  }

  async validatePlatforms(platformNames, transaction) {
    if (!platformNames.length) return new Map();
    
    const platformRecords = await this.PlatformStatus.findAll({
      where: { platform: { [Op.in]: platformNames } },
      transaction,
    });
    
    const platformMap = new Map(platformRecords.map(p => [p.platform, p.id]));
    const missingPlatforms = platformNames.filter(name => !platformMap.has(name));
    
    if (missingPlatforms.length > 0) {
      throw new Error(`Platforms not found: ${missingPlatforms.join(', ')}`);
    }
    
    return platformMap;
  }

  async updateRunCaseStatusesForCase(currentRunCase, newStatuses, platformMap, userId, transaction) {
    const runCaseId = currentRunCase.id;
    
    const existingStatuses = await this.RunCaseStatus.findAll({
      where: { runCaseId },
      transaction,
    });
    
    const existingStatusMap = new Map(existingStatuses.map(status => [status.platformId, status]));
    const newPlatformIds = new Set();
    const statusUpdates = [];
    
    for (const { platform, status } of newStatuses) {
      const platformId = platformMap.get(platform);
      if (!platformId) {
        throw new Error(`Platform "${platform}" not found`);
      }
      
      newPlatformIds.add(platformId);
      statusUpdates.push({ platformId, status, platform });
    }
    
    const platformsToDelete = [...existingStatusMap.keys()].filter(platformId => !newPlatformIds.has(platformId));
    
    if (platformsToDelete.length > 0) {
      await this.RunCaseStatus.destroy({
        where: {
          runCaseId,
          platformId: { [Op.in]: platformsToDelete },
        },
        transaction,
      });
    }
    
    for (const { platformId, status } of statusUpdates) {
      const existingStatus = existingStatusMap.get(platformId);
      
      if (existingStatus) {
        if (existingStatus.status !== status) {
          await existingStatus.update({ status, userId }, { transaction });
        }
      } else {
        await this.RunCaseStatus.create({
          runCaseId,
          platformId,
          status,
          userId,
        }, { transaction });
      }
    }
  }

  buildSortOrder(sortColumn, sortDirection) {
    const allowedSortColumns = ['id', 'title', 'priority', 'type', 'createdAt', 'updatedAt'];
    const direction = sortDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    if (sortColumn && allowedSortColumns.includes(sortColumn)) {
      if (sortColumn === 'title' || sortColumn === 'priority' || sortColumn === 'type') {
        return [[this.Case, sortColumn, direction]];
      }
      return [[sortColumn, direction]];
    }
    
    return [['createdAt', 'DESC']];
  }

  buildAdvancedSortOrder(sortColumn, sortDirection) {
    if (!sortColumn?.trim()) {
      return [['updatedAt', 'DESC']];
    }

    if (sortColumn === 'caseId') {
      const { Sequelize } = require('sequelize');
      return [
        Sequelize.literal(`
        CASE 
          WHEN "case"."customId" IS NULL THEN ${sortDirection === 'ASC' ? 'TRUE' : 'FALSE'}
          WHEN REGEXP_REPLACE("case"."customId", '[^0-9]', '', 'g') = '' THEN ${sortDirection === 'ASC' ? 'TRUE' : 'FALSE'}
          ELSE FALSE 
        END,
        NULLIF(REGEXP_REPLACE("case"."customId", '[^0-9]', '', 'g'), '')::BIGINT ${sortDirection} NULLS LAST
      `),
      ];
    }

    const caseFields = ['title', 'description', 'priority'];
    return caseFields.includes(sortColumn) ? [['case', sortColumn, sortDirection]] : [[sortColumn, sortDirection]];
  }

  buildSearchConditions(search) {
    if (!search) return {};
    
    return {
      [Op.or]: [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { customId: { [Op.iLike]: `%${search}%` } },
      ],
    };
  }

  deriveTestCaseStatus(devStatuses = []) {
    if (!devStatuses || devStatuses.length === 0) {
      return 'No Dev';
    }
    
    if (devStatuses.every((s) => s.status === 'passed')) {
      return 'passed';
    }
    if (devStatuses.some((s) => s.status === 'failed')) {
      return 'pending';
    }
    if (devStatuses.some((s) => s.status === 'pending')) {
      return 'pending';
    }
    
    return 'Pending';
  }
}

module.exports = RunCasesController; 