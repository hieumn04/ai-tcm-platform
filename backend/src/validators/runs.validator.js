const ResponseUtil = require('../utils/response.util');

class RunsValidator {
  /**
   * Validate run creation
   */
  static validateCreateRun(req, res, next) {
    const errors = [];
    const { name, state, configurations } = req.body;
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
    if (state !== undefined && (!Number.isInteger(state) || state < 0)) {
      errors.push('State must be a non-negative integer');
    }

    if (configurations !== undefined && (!Number.isInteger(configurations) || configurations < 0)) {
      errors.push('Configurations must be a non-negative integer');
    }

    const { description, ticketKey } = req.body;

    if (description && description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    if (ticketKey && ticketKey.length > 100) {
      errors.push('Ticket key must be less than 100 characters');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate run update
   */
  static validateUpdateRun(req, res, next) {
    const errors = [];
    const { runId } = req.params;

    if (!runId || !Number.isInteger(parseInt(runId))) {
      errors.push('Run ID is required and must be an integer');
    }

    // Optional field validations (since update can be partial)
    const { name, state, configurations, description, ticketKey } = req.body;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        errors.push('Name cannot be empty');
      } else if (name.length > 255) {
        errors.push('Name must be less than 255 characters');
      }
    }

    if (state !== undefined && (!Number.isInteger(state) || state < 0)) {
      errors.push('State must be a non-negative integer');
    }

    if (configurations !== undefined && (!Number.isInteger(configurations) || configurations < 0)) {
      errors.push('Configurations must be a non-negative integer');
    }

    if (description !== undefined && description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    if (ticketKey !== undefined && ticketKey.length > 100) {
      errors.push('Ticket key must be less than 100 characters');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate run duplication
   */
  static validateDuplicateRun(req, res, next) {
    const errors = [];
    const { id, name, description } = req.body;

    if (!id || !Number.isInteger(parseInt(id))) {
      errors.push('Source run ID is required and must be an integer');
    }

    if (name !== undefined) {
      if (name.trim().length === 0) {
        errors.push('Name cannot be empty');
      } else if (name.length > 255) {
        errors.push('Name must be less than 255 characters');
      }
    }

    if (description !== undefined && description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  /**
   * Validate run listing
   */
  static validateListRuns(req, res, next) {
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
   * Validate run show/details
   */
  static validateShowRun(req, res, next) {
    const errors = [];
    const { runId } = req.params;

    if (!runId || !Number.isInteger(parseInt(runId))) {
      errors.push('Run ID is required and must be an integer');
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
    if (req.body.description) req.body.description = sanitizeString(req.body.description);
    if (req.body.ticketKey) req.body.ticketKey = sanitizeString(req.body.ticketKey);

    // Convert string numbers to integers
    if (req.body.state) req.body.state = parseInt(req.body.state);
    if (req.body.configurations) req.body.configurations = parseInt(req.body.configurations);
    if (req.body.id) req.body.id = parseInt(req.body.id);

    next();
  }
}

module.exports = RunsValidator; 