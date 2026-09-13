const ResponseUtil = require('../utils/response.util');

class CasesValidator {
  /**
   * Validate case creation
   */
  static validateCreateCase(req, res, next) {
    const errors = [];
    const { title, state, priority, type, automationStatus, template, userId } = req.body;
    const { folderId } = req.query;

    // Required fields validation
    if (!title || title.trim().length === 0) {
      errors.push('Title is required and cannot be empty');
    } else if (title.length > 255) {
      errors.push('Title must be less than 255 characters');
    }

    if (state === null || state === undefined) {
      errors.push('State is required');
    } else if (!Number.isInteger(state) || state < 0) {
      errors.push('State must be a non-negative integer');
    }

    if (priority === null || priority === undefined) {
      errors.push('Priority is required');
    } else if (!Number.isInteger(priority) || priority < 0 || priority > 4) {
      errors.push('Priority must be an integer between 0 and 4');
    }

    if (type === null || type === undefined) {
      errors.push('Type is required');
    } else if (!Number.isInteger(type) || type < 0) {
      errors.push('Type must be a non-negative integer');
    }

    if (automationStatus === null || automationStatus === undefined) {
      errors.push('Automation status is required');
    } else if (!Number.isInteger(automationStatus) || automationStatus < 0) {
      errors.push('Automation status must be a non-negative integer');
    }

    if (template === null || template === undefined) {
      errors.push('Template is required');
    } else if (!Number.isInteger(template) || template < 0) {
      errors.push('Template must be a non-negative integer');
    }

    if (!userId || !Number.isInteger(userId)) {
      errors.push('User ID is required and must be an integer');
    }

    if (!folderId || !Number.isInteger(parseInt(folderId))) {
      errors.push('Folder ID is required and must be an integer');
    }

    // Optional fields validation
    const { description, preConditions, expectedResults, customId, complexity } = req.body;

    if (description && description.length > 5000) {
      errors.push('Description must be less than 5000 characters');
    }

    if (preConditions && preConditions.length > 2000) {
      errors.push('Pre-conditions must be less than 2000 characters');
    }

    if (expectedResults && expectedResults.length > 2000) {
      errors.push('Expected results must be less than 2000 characters');
    }

    if (customId && customId.length > 100) {
      errors.push('Custom ID must be less than 100 characters');
    }

    if (complexity && !['1', '2', '3'].includes(complexity)) {
      errors.push('Complexity must be "1", "2", or "3"');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate case update
   */
  static validateUpdateCase(req, res, next) {
    const errors = [];
    const { caseId } = req.params;

    if (!caseId || !Number.isInteger(parseInt(caseId))) {
      errors.push('Case ID is required and must be an integer');
    }

    // Optional field validations (since update can be partial)
    const { title, state, priority, type, automationStatus, template, description, preConditions, expectedResults, customId, complexity } = req.body;

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        errors.push('Title cannot be empty');
      } else if (title.length > 255) {
        errors.push('Title must be less than 255 characters');
      }
    }

    if (state !== undefined && (!Number.isInteger(state) || state < 0)) {
      errors.push('State must be a non-negative integer');
    }

    if (priority !== undefined && (!Number.isInteger(priority) || priority < 0 || priority > 4)) {
      errors.push('Priority must be an integer between 0 and 4');
    }

    if (type !== undefined && (!Number.isInteger(type) || type < 0)) {
      errors.push('Type must be a non-negative integer');
    }

    if (automationStatus !== undefined && (!Number.isInteger(automationStatus) || automationStatus < 0)) {
      errors.push('Automation status must be a non-negative integer');
    }

    if (template !== undefined && (!Number.isInteger(template) || template < 0)) {
      errors.push('Template must be a non-negative integer');
    }

    if (description !== undefined && description.length > 5000) {
      errors.push('Description must be less than 5000 characters');
    }

    if (preConditions !== undefined && preConditions.length > 2000) {
      errors.push('Pre-conditions must be less than 2000 characters');
    }

    if (expectedResults !== undefined && expectedResults.length > 2000) {
      errors.push('Expected results must be less than 2000 characters');
    }

    if (customId !== undefined && customId.length > 100) {
      errors.push('Custom ID must be less than 100 characters');
    }

    if (complexity !== undefined && !['1', '2', '3'].includes(complexity)) {
      errors.push('Complexity must be "1", "2", or "3"');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate bulk delete
   */
  static validateBulkDelete(req, res, next) {
    const errors = [];
    const { caseIds, deleteAll, folderId } = req.body;

    if (deleteAll) {
      if (!folderId || !Number.isInteger(parseInt(folderId))) {
        errors.push('Folder ID is required and must be an integer for deleting all cases');
      }
    } else {
      if (!caseIds || !Array.isArray(caseIds)) {
        errors.push('Case IDs must be provided as an array');
      } else if (caseIds.length === 0) {
        errors.push('At least one case ID must be provided');
      } else {
        const invalidIds = caseIds.filter(id => !Number.isInteger(id) || id <= 0);
        if (invalidIds.length > 0) {
          errors.push('All case IDs must be positive integers');
        }
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate case listing
   */
  static validateListCases(req, res, next) {
    const errors = [];
    const { page, limit, sortBy, sortOrder, priority, state, type, automationStatus, complexity, useAI } = req.query;

    if (page && (!Number.isInteger(parseInt(page)) || parseInt(page) < 1)) {
      errors.push('Page must be a positive integer');
    }

    if (limit && (!Number.isInteger(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      errors.push('Limit must be a positive integer between 1 and 100');
    }

    const allowedSortFields = ['id', 'title', 'priority', 'state', 'type', 'createdAt', 'updatedAt', 'customId', 'description', 'stepsDetail', 'expectedResults'];
    if (sortBy && !allowedSortFields.includes(sortBy)) {
      errors.push(`Sort field must be one of: ${allowedSortFields.join(', ')}`);
    }

    if (sortOrder && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
      errors.push('Sort order must be "asc" or "desc"');
    }

    if (priority && (!Number.isInteger(parseInt(priority)) || parseInt(priority) < 0 || parseInt(priority) > 4)) {
      errors.push('Priority filter must be an integer between 0 and 4');
    }

    if (state && (!Number.isInteger(parseInt(state)) || parseInt(state) < 0)) {
      errors.push('State filter must be a non-negative integer');
    }

    if (type && (!Number.isInteger(parseInt(type)) || parseInt(type) < 0)) {
      errors.push('Type filter must be a non-negative integer');
    }

    if (automationStatus && (!Number.isInteger(parseInt(automationStatus)) || parseInt(automationStatus) < 0)) {
      errors.push('Automation status filter must be a non-negative integer');
    }

    if (complexity && !['1', '2', '3'].includes(complexity)) {
      errors.push('Complexity filter must be "1", "2", or "3"');
    }

    if (useAI && !['true', 'false'].includes(useAI.toLowerCase())) {
      errors.push('Use AI filter must be "true" or "false"');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate import data
   */
  static validateImportCases(req, res, next) {
    const errors = [];
    const { folderId } = req.query;
    const { cases } = req.body;

    if (!folderId || !Number.isInteger(parseInt(folderId))) {
      errors.push('Folder ID is required and must be an integer');
    }

    if (!cases || !Array.isArray(cases)) {
      errors.push('Cases data must be provided as an array');
    } else if (cases.length === 0) {
      errors.push('At least one case must be provided for import');
    } else if (cases.length > 1000) {
      errors.push('Cannot import more than 1000 cases at once');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate platform evidence
   */
  static validatePlatformEvidence(req, res, next) {
    const errors = [];
    const { caseId } = req.params;
    const { platform, evidenceImageUrls, evidenceDescription, deleteImageIndices } = req.body;

    if (!caseId || !Number.isInteger(parseInt(caseId))) {
      errors.push('Case ID is required and must be an integer');
    }

    if (!platform || typeof platform !== 'string') {
      errors.push('Platform is required and must be a string');
    } else {
      const validPlatforms = ['web', 'wap', 'zma', 'ios', 'android', 'api'];
      if (!validPlatforms.includes(platform.toLowerCase())) {
        errors.push(`Platform must be one of: Web, Wap, Zma, iOS, Android, API`);
      }
    }

    if (evidenceImageUrls && !Array.isArray(evidenceImageUrls)) {
      errors.push('Evidence image URLs must be an array');
    }

    if (deleteImageIndices && !Array.isArray(deleteImageIndices)) {
      errors.push('Image indices for deletion must be an array');
    } else if (deleteImageIndices) {
      const invalidIndices = deleteImageIndices.filter(i => !Number.isInteger(i) || i < 0);
      if (invalidIndices.length > 0) {
        errors.push('All image indices for deletion must be non-negative integers');
      }
    }

    if (evidenceDescription && evidenceDescription.length > 5000) {
      errors.push('Evidence description must be less than 5000 characters');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(req, res, next) {
    // Sanitize string inputs
    const sanitizeString = (str) => {
      if (typeof str === 'string') {
        return str.trim().replace(/\s+/g, ' '); // Remove extra whitespace
      }
      return str;
    };

    if (req.body.title) req.body.title = sanitizeString(req.body.title);
    if (req.body.description) req.body.description = sanitizeString(req.body.description);
    if (req.body.preConditions) req.body.preConditions = sanitizeString(req.body.preConditions);
    if (req.body.expectedResults) req.body.expectedResults = sanitizeString(req.body.expectedResults);
    if (req.body.customId) req.body.customId = sanitizeString(req.body.customId);
    if (req.body.evidenceDescription) req.body.evidenceDescription = sanitizeString(req.body.evidenceDescription);

    // Convert string numbers to integers
    if (req.body.state) req.body.state = parseInt(req.body.state);
    if (req.body.priority) req.body.priority = parseInt(req.body.priority);
    if (req.body.type) req.body.type = parseInt(req.body.type);
    if (req.body.automationStatus) req.body.automationStatus = parseInt(req.body.automationStatus);
    if (req.body.template) req.body.template = parseInt(req.body.template);
    if (req.body.userId) req.body.userId = parseInt(req.body.userId);

    next();
  }

  /**
   * Validate case duplication
   */
  static validateDuplicateCase(req, res, next) {
    const errors = [];
    const { id, title } = req.body;

    if (!id || !Number.isInteger(parseInt(id))) {
      errors.push('Source case ID is required and must be an integer');
    }

    if (title !== undefined) {
      if (title.trim().length === 0) {
        errors.push('Title cannot be empty');
      } else if (title.length > 255) {
        errors.push('Title must be less than 255 characters');
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }
}

module.exports = CasesValidator; 