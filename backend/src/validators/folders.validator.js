const ResponseUtil = require('../utils/response.util');

class FoldersValidator {
  /**
   * Validate folder creation
   */
  static validateCreateFolder(req, res, next) {
    const errors = [];
    const { name } = req.body;
    const { projectId } = req.query;

    // Required fields validation
    if (!name || name.trim().length === 0) {
      errors.push('Name is required and cannot be empty');
    } else if (name.length > 255) {
      errors.push('Name must be less than 255 characters');
    }

    if (!projectId || !Number.isInteger(parseInt(projectId))) {
      errors.push('Project ID is required and must be an integer');
    }

    // Optional fields validation
    const { detail, parentFolderId } = req.body;

    if (detail && detail.length > 2000) {
      errors.push('Detail must be less than 2000 characters');
    }

    if (parentFolderId && !Number.isInteger(parseInt(parentFolderId))) {
      errors.push('Parent folder ID must be an integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate folder update
   */
  static validateUpdateFolder(req, res, next) {
    const errors = [];
    const { folderId } = req.params;

    if (!folderId || !Number.isInteger(parseInt(folderId))) {
      errors.push('Folder ID is required and must be an integer');
    }

    // Optional field validations (since update can be partial)
    const { name, detail, projectId, parentFolderId } = req.body;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        errors.push('Name cannot be empty');
      } else if (name.length > 255) {
        errors.push('Name must be less than 255 characters');
      }
    }

    if (detail !== undefined && detail.length > 2000) {
      errors.push('Detail must be less than 2000 characters');
    }

    if (projectId !== undefined && !Number.isInteger(parseInt(projectId))) {
      errors.push('Project ID must be an integer');
    }

    if (parentFolderId !== undefined && parentFolderId !== null && !Number.isInteger(parseInt(parentFolderId))) {
      errors.push('Parent folder ID must be an integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate folder deletion
   */
  static validateDeleteFolder(req, res, next) {
    const errors = [];
    const { folderId } = req.params;

    if (!folderId || !Number.isInteger(parseInt(folderId))) {
      errors.push('Folder ID is required and must be an integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate folder listing
   */
  static validateListFolders(req, res, next) {
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
   * Validate folder show/details
   */
  static validateShowFolder(req, res, next) {
    const errors = [];
    const { folderId } = req.params;
    const { projectId } = req.query;

    if (!folderId || !Number.isInteger(parseInt(folderId))) {
      errors.push('Folder ID is required and must be an integer');
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

    if (req.body.name) req.body.name = sanitizeString(req.body.name);
    if (req.body.detail) req.body.detail = sanitizeString(req.body.detail);

    // Convert string numbers to integers
    if (req.body.projectId) req.body.projectId = parseInt(req.body.projectId);
    if (req.body.parentFolderId) req.body.parentFolderId = parseInt(req.body.parentFolderId);

    next();
  }
}

module.exports = FoldersValidator; 