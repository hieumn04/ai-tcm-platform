const ResponseUtil = require('../utils/response.util');

class ProjectsValidator {
  /**
   * Validate project creation request
   */
  static validateCreateProject(req, res, next) {
    const { name, detail, isPublic } = req.body;
    const errors = [];

    // Name validation
    if (!name) {
      errors.push('Project name is required');
    } else if (typeof name !== 'string') {
      errors.push('Project name must be a string');
    } else if (name.trim().length < 3) {
      errors.push('Project name must be at least 3 characters long');
    } else if (name.length > 255) {
      errors.push('Project name must be less than 255 characters');
    }

    // Detail validation (optional)
    if (detail !== undefined && detail !== null) {
      if (typeof detail !== 'string') {
        errors.push('Project detail must be a string');
      } else if (detail.length > 1000) {
        errors.push('Project detail must be less than 1000 characters');
      }
    }

    // isPublic validation
    if (isPublic === undefined || isPublic === null) {
      errors.push('isPublic field is required');
    } else if (typeof isPublic !== 'boolean') {
      errors.push('isPublic must be a boolean value');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate project update request
   */
  static validateUpdateProject(req, res, next) {
    const { name, detail, isPublic } = req.body;
    const { projectId } = req.params;
    const errors = [];

    // Project ID validation
    if (!projectId || isNaN(projectId)) {
      errors.push('Valid project ID is required');
    }

    // Name validation (if provided)
    if (name !== undefined) {
      if (!name || typeof name !== 'string') {
        errors.push('Project name must be a non-empty string');
      } else if (name.trim().length < 3) {
        errors.push('Project name must be at least 3 characters long');
      } else if (name.length > 255) {
        errors.push('Project name must be less than 255 characters');
      }
    }

    // Detail validation (if provided)
    if (detail !== undefined && detail !== null) {
      if (typeof detail !== 'string') {
        errors.push('Project detail must be a string');
      } else if (detail.length > 1000) {
        errors.push('Project detail must be less than 1000 characters');
      }
    }

    // isPublic validation (if provided)
    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
      errors.push('isPublic must be a boolean value');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate project ID parameter
   */
  static validateProjectId(req, res, next) {
    const { projectId } = req.params;
    const errors = [];

    if (!projectId) {
      errors.push('Project ID is required');
    } else if (isNaN(projectId)) {
      errors.push('Project ID must be a valid number');
    } else if (parseInt(projectId) <= 0) {
      errors.push('Project ID must be a positive number');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate project list query parameters
   */
  static validateListProjects(req, res, next) {
    const { limit, offset, search } = req.query;
    const errors = [];

    // Limit validation
    if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
      errors.push('Limit must be a number between 1 and 100');
    }

    // Offset validation
    if (offset && (isNaN(offset) || offset < 0)) {
      errors.push('Offset must be a non-negative number');
    }

    // Search validation
    if (search && (typeof search !== 'string' || search.trim().length < 2)) {
      errors.push('Search query must be at least 2 characters long');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Sanitize project input
   */
  static sanitizeInput(req, res, next) {
    const { body } = req;
    
    // Trim string values
    if (body.name && typeof body.name === 'string') {
      body.name = body.name.trim();
    }
    
    if (body.detail && typeof body.detail === 'string') {
      body.detail = body.detail.trim();
    }

    // Convert isPublic to boolean if it's a string
    if (typeof body.isPublic === 'string') {
      body.isPublic = body.isPublic.toLowerCase() === 'true';
    }

    next();
  }

  /**
   * Validate project ownership transfer
   */
  static validateTransferOwnership(req, res, next) {
    const { newOwnerId } = req.body;
    const { projectId } = req.params;
    const errors = [];

    if (!projectId || isNaN(projectId)) {
      errors.push('Valid project ID is required');
    }

    if (!newOwnerId || isNaN(newOwnerId)) {
      errors.push('Valid new owner ID is required');
    }

    if (parseInt(newOwnerId) === req.userId) {
      errors.push('Cannot transfer project to yourself');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }
}

module.exports = ProjectsValidator; 