const ResponseUtil = require('../utils/response.util');

class MembersValidator {
  /**
   * Validate member addition
   */
  static validateAddMember(req, res, next) {
    const errors = [];
    const { userId, projectId } = req.query;

    if (!userId || !Number.isInteger(parseInt(userId))) {
      errors.push('User ID is required and must be an integer');
    }

    if (!projectId || !Number.isInteger(parseInt(projectId))) {
      errors.push('Project ID is required and must be an integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate member update
   */
  static validateUpdateMember(req, res, next) {
    const errors = [];
    const { userId, projectId, role } = req.query;

    if (!userId || !Number.isInteger(parseInt(userId))) {
      errors.push('User ID is required and must be an integer');
    }

    if (!projectId || !Number.isInteger(parseInt(projectId))) {
      errors.push('Project ID is required and must be an integer');
    }

    if (role === undefined || role === null || role === '' || !Number.isInteger(parseInt(role))) {
      errors.push('Role is required and must be an integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate member deletion
   */
  static validateDeleteMember(req, res, next) {
    const errors = [];
    const { userId, projectId } = req.query;

    if (!userId || !Number.isInteger(parseInt(userId))) {
      errors.push('User ID is required and must be an integer');
    }

    if (!projectId || !Number.isInteger(parseInt(projectId))) {
      errors.push('Project ID is required and must be an integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate member listing
   */
  static validateListMembers(req, res, next) {
    const errors = [];
    const { projectId } = req.query;

    if (!projectId || !Number.isInteger(parseInt(projectId))) {
      errors.push('Project ID is required and must be an integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate member permission check
   */
  static validateCheckPermissions(req, res, next) {
    const errors = [];
    
    // No specific validation needed as userId comes from middleware
    // Just ensure the user is authenticated (which middleware handles)
    
    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(req, res, next) {
    // Convert string numbers to integers for query parameters
    if (req.query.userId !== undefined) req.query.userId = parseInt(req.query.userId);
    if (req.query.projectId !== undefined) req.query.projectId = parseInt(req.query.projectId);
    if (req.query.role !== undefined) req.query.role = parseInt(req.query.role);

    next();
  }
}

module.exports = MembersValidator; 