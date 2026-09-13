const ResponseUtil = require('../utils/response.util');
const DatabaseUtil = require('../utils/database.util');

class CasesController {
  constructor(sequelize, Case) {
    this.sequelize = sequelize;
    this.Case = Case;
    this.User = null;
    this.DevStatus = null;
    this.PlatformEvidence = null;
    this.Step = null;
    this.Attachment = null;
    this.CaseAttachment = null;
    this.setupModels();
  }

  setupModels() {
    const { DataTypes } = require('sequelize');
    this.User = require('../models/users.model')(this.sequelize, DataTypes);
    this.DevStatus = require('../models/devStatus.model')(this.sequelize, DataTypes);
    this.PlatformEvidence = require('../models/platformEvidence.model')(this.sequelize, DataTypes);
    this.Step = require('../models/steps.model')(this.sequelize, DataTypes);
    this.Attachment = require('../models/attachments.model')(this.sequelize, DataTypes);
    this.CaseAttachment = require('../models/caseAttachments.model')(this.sequelize, DataTypes);
  }

  ensureAssociations() {
    if (!this.Case.associations.User) {
      this.Case.belongsTo(this.User, { foreignKey: 'userId' });
    }
    if (!this.Case.associations.DevStatus) {
      this.Case.hasMany(this.DevStatus, { foreignKey: 'caseId', onDelete: 'CASCADE' });
    }
    if (!this.DevStatus.associations.Case) {
      this.DevStatus.belongsTo(this.Case, { foreignKey: 'caseId' });
    }
    if (!this.DevStatus.associations.creator) {
      this.DevStatus.belongsTo(this.User, { foreignKey: 'createdBy', as: 'creator' });
    }
    if (!this.DevStatus.associations.updater) {
      this.DevStatus.belongsTo(this.User, { foreignKey: 'updatedBy', as: 'updater' });
    }
    if (!this.Case.associations.PlatformEvidence) {
      this.Case.hasMany(this.PlatformEvidence, { foreignKey: 'case_id' });
    }
    if (!this.PlatformEvidence.associations.Case) {
      this.PlatformEvidence.belongsTo(this.Case, { foreignKey: 'case_id' });
    }
  }

  /**
   * Create new test case
   */
  async createCase(req, res) {
    try {
      const { folderId } = req.query;
      const {
        title, state, priority, type, automationStatus, description,
        template, preConditions, expectedResults, userId, customId, complexity
      } = req.body;

      const newCase = await this.Case.create({
        title, state, priority, type, automationStatus, description,
        template, preConditions, expectedResults, folderId,
        isAuto: 'manual', useAI: false, userId, customId, complexity,
      });

      this.ensureAssociations();
      const createdCase = await this.Case.findOne({
        where: { id: newCase.id },
        attributes: { exclude: ['is_deleted'] },
        include: [{ model: this.User, attributes: ['email'] }],
      });

      ResponseUtil.created(res, createdCase, 'Test case created successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to create test case');
    }
  }

  /**
   * Update existing test case
   */
  async updateCase(req, res) {
    try {
      const { caseId } = req.params;
      const updateData = { ...req.body };

      // Remove steps from update data as they're handled separately
      if (updateData.Steps) {
        delete updateData.Steps;
      }

      const testcase = await this.Case.findByPk(caseId);
      if (!testcase) {
        return ResponseUtil.notFound(res, 'Test case not found');
      }

      await testcase.update(updateData);
      ResponseUtil.success(res, testcase, 'Test case updated successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to update test case');
    }
  }

  /**
   * Delete test cases (bulk delete)
   */
  async deleteCases(req, res) {
    try {
      const { caseIds, deleteAll, folderId } = req.body;

      if (deleteAll) {
        if (!folderId) {
          return ResponseUtil.validationError(res, ['Folder ID is required for deleting all cases']);
        }

        const [updatedCount] = await this.Case.update(
          { is_deleted: true },
          { where: { folderId, is_deleted: false } }
        );
        
        return ResponseUtil.success(res, { deleted: updatedCount }, 'Cases soft deleted successfully');
      }

      if (!caseIds || !Array.isArray(caseIds)) {
        return ResponseUtil.validationError(res, ['Invalid caseIds array']);
      }

      const [updatedCount] = await this.Case.update(
        { is_deleted: true },
        { where: { id: caseIds, is_deleted: false } }
      );
      
      ResponseUtil.success(res, { deleted: updatedCount }, 'Cases soft deleted successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to delete test cases');
    }
  }

  /**
   * Get test case details
   */
  async showCase(req, res) {
    try {
      const { caseId } = req.params;

      const basicCase = await this.Case.findOne({
        where: { id: caseId, is_deleted: false }
      });
      
      if (!basicCase) {
        return ResponseUtil.notFound(res, 'Test case not found');
      }

      this.ensureAssociations();

      if (!this.Case.associations.Step) {
        this.Case.belongsToMany(this.Step, { through: 'caseSteps' });
      }
      if (!this.Case.associations.Attachment) {
        this.Case.belongsToMany(this.Attachment, { through: { model: this.CaseAttachment } });
      }

      const testcase = await this.Case.findOne({
        where: { id: caseId, is_deleted: false },
        attributes: { exclude: ['is_deleted'] },
        include: [
          { 
            model: this.User, 
            attributes: ['email', 'username'],
            required: false 
          },
          { 
            model: this.Step,
            required: false 
          },
          { 
            model: this.DevStatus, 
            include: [{ 
              model: this.User, 
              as: 'creator', 
              attributes: ['email', 'username'],
              required: false 
            }],
            required: false 
          },
          { 
            model: this.Attachment, 
            through: { model: this.CaseAttachment },
            required: false 
          },
          { 
            model: this.PlatformEvidence,
            required: false 
          },
        ],
      });

      if (!testcase) {
        return ResponseUtil.notFound(res, 'Test case not found');
      }

      const testcaseJSON = testcase.toJSON();

      if (testcaseJSON.DevStatus) {
        testcaseJSON.devStatuses = testcaseJSON.DevStatus.map(ds => ({
          ...ds,
          caseId: ds.caseId || ds.case_id,
        }));
        delete testcaseJSON.DevStatus;
      }

      if (testcaseJSON.PlatformEvidence) {
        testcaseJSON.platformEvidences = testcaseJSON.PlatformEvidence;
        delete testcaseJSON.PlatformEvidence;
      }

      ResponseUtil.success(res, testcaseJSON, 'Test case retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve test case');
    }
  }

  /**
   * List test cases with filtering and pagination
   */
  async listCases(req, res) {
    try {
      const {
        page = 1, limit = 25, sortBy = 'id', sortOrder = 'desc',
        priority, state, type, automationStatus, complexity, isAuto, useAI,
        search, folderId
      } = req.query;

      const { Op } = require('sequelize');

      // Build where conditions
      let where = { is_deleted: false };
      if (folderId) where.folderId = folderId;
      if (priority) where.priority = priority;
      if (state) where.state = state;
      if (type) where.type = type;
      if (automationStatus) where.automationStatus = automationStatus;
      if (complexity) where.complexity = complexity;
      if (isAuto) where.isAuto = isAuto;
      if (useAI !== undefined) where.useAI = useAI === 'true';

      // Search functionality
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { customId: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Build sort order
      const allowedSortFields = ['id', 'title', 'priority', 'state', 'type', 'createdAt', 'updatedAt', 'customId', 'description', 'stepsDetail', 'expectedResults'];
      
      let order;
      if (sortBy === 'customId') {
        // Handle customId sorting with numeric conversion for proper ordering
        const { Sequelize } = require('sequelize');
        const direction = sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        order = [
          Sequelize.literal(`
            CASE 
              WHEN "customId" IS NULL THEN ${direction === 'ASC' ? 'TRUE' : 'FALSE'}
              WHEN REGEXP_REPLACE("customId", '[^0-9]', '', 'g') = '' THEN ${direction === 'ASC' ? 'TRUE' : 'FALSE'}
              ELSE FALSE 
            END,
            NULLIF(REGEXP_REPLACE("customId", '[^0-9]', '', 'g'), '')::BIGINT ${direction} NULLS LAST
          `)
        ];
      } else {
        order = DatabaseUtil.buildSortOrder(sortBy, sortOrder, allowedSortFields);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      this.ensureAssociations();

      const { count, rows: cases } = await this.Case.findAndCountAll({
        where,
        attributes: { exclude: ['is_deleted'] },
        include: [
          { 
            model: this.User, 
            attributes: ['email', 'username'],
            required: false 
          },
          { 
            model: this.DevStatus, 
            include: [{ 
              model: this.User, 
              as: 'creator', 
              attributes: ['email', 'username'],
              required: false 
            }],
            required: false 
          },
        ],
        order: [order],
        limit: parseInt(limit),
        offset,
      });

      const pagination = DatabaseUtil.createPagination(count, parseInt(page), parseInt(limit));
      ResponseUtil.paginated(res, cases, pagination, 'Test cases retrieved successfully');
    } catch (error) {

      ResponseUtil.serverError(res, error, 'Failed to retrieve test cases');
    }
  }

  /**
   * Import test cases from file
   */
  async importCases(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { folderId } = req.query;
      const { cases: importData } = req.body;

      // Validate request
      if (!folderId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['folderId is required']);
      }

      if (!importData || !Array.isArray(importData) || importData.length === 0) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['Cases array is required and must not be empty']);
      }

      // Define required fields for validation (matching frontend mandatory fields)
      const requiredFields = ['title'];

      // Helper function to check if value is empty
      const isEmpty = (value) => value === null || value === undefined || value === '';

      // Validate required fields in all cases
      const invalidCases = [];
      importData.forEach((caseData, index) => {
        const missingFields = requiredFields.filter(field => isEmpty(caseData[field]));
        if (missingFields.length > 0) {
          const safeCustomId = caseData.customId ? String(caseData.customId) : 'unknown';
          const safeTitle = caseData.title ? String(caseData.title).substring(0, 50) : 'unknown';
          
          invalidCases.push({
            index: index + 1,
            customId: safeCustomId,
            title: safeTitle,
            missingFields
          });
        }
      });

      if (invalidCases.length > 0) {
        await transaction.rollback();
        const errorMessage = `Some cases have missing required fields: ${invalidCases.map(c => 
          `Case ${c.index} (ID: ${c.customId}): missing ${c.missingFields.join(', ')}`
        ).join('; ')}`;
        return ResponseUtil.validationError(res, [errorMessage]);
      }

      // Find the highest numeric customId in the folder for auto-generation
      const { Op, Sequelize } = require('sequelize');
      const maxCustomIdQuery = await this.Case.findOne({
        where: {
          folderId,
          is_deleted: false,
          customId: {
            [Op.regexp]: '^[0-9]+$',
          },
        },
        order: [[Sequelize.literal('CAST("customId" AS INTEGER)'), 'DESC']],
        attributes: ['customId'],
        transaction,
      });

      let nextNumericId = maxCustomIdQuery?.customId ? parseInt(maxCustomIdQuery.customId) + 1 : 1;
      let importedCount = 0;
      let updatedCount = 0;
      const createdCases = [];
      const updatedCaseIds = [];
      const failedCases = [];

      // Process each case
      for (const [index, caseData] of importData.entries()) {
        try {
          // Ensure customId is a string and handle auto-generation
          let customId = '';
          if (caseData.customId !== null && caseData.customId !== undefined) {
            customId = String(caseData.customId).trim();
          }
          
          // Auto-generate customId if not provided or empty
          if (!customId) {
            customId = nextNumericId.toString();
            nextNumericId++;
          }

          // Set default values for optional fields with better type handling
          const processedCaseData = {
            title: String(caseData.title || '').trim(),
            description: String(caseData.description || '').trim(),
            priority: caseData.priority ?? 2,
            state: caseData.state ?? 0,
            type: caseData.type ?? 0,
            automationStatus: caseData.automationStatus ?? 0,
            template: caseData.template ?? 0,
            preConditions: String(caseData.preConditions || '').trim(),
            expectedResults: String(caseData.expectedResults || '').trim(),
            stepsDetail: String(caseData.stepsDetail || '').trim(),
            isAuto: String(caseData.isAuto || 'manual').trim(),
            useAI: caseData.useAI !== undefined ? Boolean(caseData.useAI) : false,
            customId: customId,
            complexity: String(caseData.complexity || '1').trim(),
            userId: caseData.userId || req.userId,
            folderId: parseInt(folderId)
          };

          // Check for duplicate case by customId and title
          const whereCondition = {
            folderId: parseInt(folderId),
            customId: processedCaseData.customId,
            is_deleted: false,
          };

          // Also check by title to prevent exact duplicates
          if (processedCaseData.title) {
            whereCondition.title = processedCaseData.title;
          }

          const existingCase = await this.Case.findOne({
            where: whereCondition,
            transaction,
          });

          let result;
          if (existingCase) {
            // Update existing case
            result = await existingCase.update(processedCaseData, { transaction });
            updatedCount++;
            updatedCaseIds.push(result.id);
          } else {
            // Create new case
            result = await this.Case.create(processedCaseData, { transaction });
            importedCount++;
            createdCases.push(result);
          }

        } catch (caseError) {
          const safeCustomId = caseData.customId ? String(caseData.customId) : 'unknown';
          const safeTitle = caseData.title ? String(caseData.title).substring(0, 50) : 'unknown';
          
          failedCases.push({
            index: index + 1,
            customId: safeCustomId,
            title: safeTitle,
            error: caseError.message,
            details: caseError.errors ? caseError.errors.map(e => e.message).join(', ') : caseError.message
          });
        }
      }

      // If there were failed cases, rollback and return detailed error
      if (failedCases.length > 0) {
        await transaction.rollback();
        const errorMessage = `Failed to import cases: ${failedCases.length} out of ${importData.length} cases failed. ${failedCases.map(fc => `Case ${fc.index} (ID: ${fc.customId}, Title: ${fc.title}): ${fc.details}`).join('; ')}`;

        return ResponseUtil.serverError(res, new Error('Some cases failed to import'), errorMessage);
      }

      // Get all processed cases for response (both created and updated)
      const allProcessedCaseIds = [...createdCases.map(c => c.id), ...updatedCaseIds];
      
      this.ensureAssociations();
      const processedCases = await this.Case.findAll({
        where: { id: allProcessedCaseIds, is_deleted: false },
        attributes: { exclude: ['is_deleted'] },
        include: [{ 
          model: this.User, 
          attributes: ['email', 'username'],
          required: false 
        }],
        transaction,
      });

      await transaction.commit();

      // Return detailed success response
      const message = importedCount && updatedCount 
        ? `Successfully imported ${importedCount} new cases and updated ${updatedCount} existing cases (${importedCount + updatedCount}/${importData.length} total processed)`
        : importedCount 
          ? `Successfully imported ${importedCount} test cases (${importedCount}/${importData.length} total processed)`
          : `Successfully updated ${updatedCount} test cases (${updatedCount}/${importData.length} total processed)`;

      ResponseUtil.created(res, processedCases, message);

    } catch (error) {
      await transaction.rollback();


      const errorMessage = `Failed to import test cases: ${error.message}${error.errors ? '. Details: ' + error.errors.map(e => e.message).join(', ') : ''}`;
      ResponseUtil.serverError(res, error, errorMessage);
    }
  }

  /**
   * Get platform evidence for a case
   */
  async getPlatformEvidence(req, res) {
    try {
      const { caseId } = req.params;

      if (!caseId || isNaN(parseInt(caseId))) {
        return ResponseUtil.validationError(res, ['Invalid case ID']);
      }

      const testcase = await this.Case.findOne({
        where: { id: caseId, is_deleted: false }
      });
      if (!testcase) {
        return ResponseUtil.notFound(res, 'Test case not found');
      }

      const evidence = await this.PlatformEvidence.findAll({
        where: { case_id: caseId },
      });

      const mappedEvidence = evidence.map(ev => ({
        platform: ev.platform,
        evidenceImageUrls: ev.evidenceImageUrls,
        evidenceDescription: ev.evidenceDescription,
      }));

      ResponseUtil.success(res, mappedEvidence, 'Platform evidence retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve platform evidence');
    }
  }

  /**
   * Update platform evidence for a case
   */
  async updatePlatformEvidence(req, res) {
    try {
      const { caseId, platform } = req.params;
      const { evidenceImageUrls, evidenceDescription, deleteImageIndices } = req.body;

      if (!caseId || isNaN(parseInt(caseId))) {
        return ResponseUtil.validationError(res, ['Invalid case ID']);
      }

      if (!platform) {
        return ResponseUtil.validationError(res, ['Platform is required']);
      }

      const validPlatforms = ['Web', 'Wap', 'Zma', 'iOS', 'Android', 'API'];
      if (!validPlatforms.includes(platform)) {
        return ResponseUtil.validationError(res, [`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`]);
      }

      const testcase = await this.Case.findOne({
        where: { id: caseId, is_deleted: false }
      });
      if (!testcase) {
        return ResponseUtil.notFound(res, 'Test case not found');
      }

      this.ensureAssociations();

      const [evidence, created] = await this.PlatformEvidence.findOrCreate({
        where: { case_id: parseInt(caseId), platform: platform },
        defaults: {
          case_id: parseInt(caseId),
          platform: platform,
          evidenceImageUrls: [],
          evidenceDescription: '',
        },
      });

      let currentImageUrls = evidence.evidenceImageUrls || [];

      // Handle image deletions by index for precision
      if (deleteImageIndices && Array.isArray(deleteImageIndices) && deleteImageIndices.length > 0) {
        const indicesToDelete = new Set(deleteImageIndices);
        currentImageUrls = currentImageUrls.filter((_, index) => !indicesToDelete.has(index));
      }

      if (evidenceImageUrls && Array.isArray(evidenceImageUrls)) {
        // Create a new array to ensure Sequelize detects the change to the JSON field
        currentImageUrls = [...currentImageUrls, ...evidenceImageUrls];
      }

      evidence.evidenceImageUrls = currentImageUrls;
      if (evidenceDescription !== null && evidenceDescription !== undefined) {
        evidence.evidenceDescription = evidenceDescription;
      }

      await evidence.save();
      
      const action = created ? 'created' : 'updated';
      ResponseUtil.success(res, evidence, `Platform evidence ${action} successfully`);
    } catch (error) {

      ResponseUtil.serverError(res, error, 'Failed to update platform evidence');
    }
  }

  /**
   * Duplicate test case
   */
  async duplicateCase(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id, title } = req.body;

      const sourceCase = await this.Case.findByPk(id, { transaction });
      if (!sourceCase) {
        await transaction.rollback();
        return ResponseUtil.notFound(res, 'Source case not found');
      }

      // Find the highest customId in the folder for auto-generation
      const { Op, Sequelize } = require('sequelize');
      const allCases = await this.Case.findAll({
        where: {
          folderId: sourceCase.folderId,
          is_deleted: false,
          customId: {
            [Op.not]: null,
          },
        },
        attributes: ['customId'],
        transaction,
      });

      // Extract numeric parts from all customIds and find the maximum
      let maxNumericValue = 0;
      let sourcePrefix = '';
      let sourceSuffix = '';
      
      // Analyze source case customId pattern
      if (sourceCase.customId) {
        const sourceMatch = sourceCase.customId.match(/^([^0-9]*)([0-9]+)(.*)$/);
        if (sourceMatch) {
          sourcePrefix = sourceMatch[1] || '';
          sourceSuffix = sourceMatch[3] || '';
        }
      }

      // Find maximum numeric value from all customIds
      allCases.forEach(caseItem => {
        if (caseItem.customId) {
          const match = caseItem.customId.match(/([0-9]+)/);
          if (match) {
            const numericValue = parseInt(match[1]);
            if (numericValue > maxNumericValue) {
              maxNumericValue = numericValue;
            }
          }
        }
      });

      // Generate next customId
      const nextNumericValue = maxNumericValue + 1;
      const newCustomId = sourcePrefix + nextNumericValue + sourceSuffix;

      // Create new case with duplicated data
      const newCaseData = {
        customId: newCustomId,
        title: title || `${sourceCase.title} (copy)`,
        state: sourceCase.state,
        priority: sourceCase.priority,
        type: sourceCase.type,
        automationStatus: sourceCase.automationStatus,
        description: sourceCase.description,
        template: sourceCase.template,
        preConditions: sourceCase.preConditions,
        expectedResults: sourceCase.expectedResults,
        isAuto: sourceCase.isAuto,
        stepsDetail: sourceCase.stepsDetail,
        useAI: sourceCase.useAI,
        userId: req.userId || sourceCase.userId,
        folderId: sourceCase.folderId,
        complexity: sourceCase.complexity,
      };

      const newCase = await this.Case.create(newCaseData, { transaction });

      await transaction.commit();
      ResponseUtil.created(res, newCase, 'Test case duplicated successfully');
    } catch (error) {
      await transaction.rollback();
      ResponseUtil.serverError(res, error, 'Failed to duplicate test case');
    }
  }
}

module.exports = CasesController;