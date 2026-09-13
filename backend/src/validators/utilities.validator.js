const ResponseUtil = require('../utils/response.util');

class UtilitiesValidator {

  // HOME DASHBOARD VALIDATION
  static validateProjectDashboard(req, res, next) {
    const errors = [];
    const { projectId } = req.params;

    if (!projectId) {
      errors.push('projectId is required');
    } else if (!Number.isInteger(parseInt(projectId, 10)) || parseInt(projectId, 10) <= 0) {
      errors.push('projectId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  // CHARTS & ANALYTICS VALIDATION
  static validateUserCasesChart(req, res, next) {
    const errors = [];
    const { email, startDate, endDate } = req.query;

    if (email && typeof email !== 'string') {
      errors.push('email must be a string');
    }

    if (email && email.length > 255) {
      errors.push('email must be less than 255 characters');
    }

    // Validate date parameters
    if (startDate && !endDate) {
      errors.push('endDate is required when startDate is provided');
    }

    if (endDate && !startDate) {
      errors.push('startDate is required when endDate is provided');
    }

    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (isNaN(startDateObj.getTime())) {
        errors.push('startDate must be a valid date in YYYY-MM-DD format');
      }

      if (isNaN(endDateObj.getTime())) {
        errors.push('endDate must be a valid date in YYYY-MM-DD format');
      }

      if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime()) && startDateObj > endDateObj) {
        errors.push('startDate cannot be after endDate');
      }

      // Limit date range to prevent performance issues (max 1 year)
      if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
        const daysDiff = Math.abs((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 365) {
          errors.push('Date range cannot exceed 365 days');
        }
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateCasesAnalytics(req, res, next) {
    const errors = [];
    const { projectId } = req.query;

    if (!projectId) {
      errors.push('projectId is required');
    } else if (!Number.isInteger(parseInt(projectId, 10)) || parseInt(projectId, 10) <= 0) {
      errors.push('projectId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  // DEV STATUS VALIDATION
  static validateCreateDevStatus(req, res, next) {
    const errors = [];
    const { case_id, role, status } = req.body;

    if (!case_id) {
      errors.push('case_id is required');
    } else if (!Number.isInteger(parseInt(case_id, 10)) || parseInt(case_id, 10) <= 0) {
      errors.push('case_id must be a positive integer');
    }

    if (!role) {
      errors.push('role is required');
    } else if (typeof role !== 'string') {
      errors.push('role must be a string');
    } else {
      const validRoles = ['app', 'backend', 'frontend'];
      if (!validRoles.includes(role)) {
        errors.push(`role must be one of: ${validRoles.join(', ')}`);
      }
    }

    if (!status) {
      errors.push('status is required');
    } else if (typeof status !== 'string') {
      errors.push('status must be a string');
    } else {
      const validStatuses = ['passed', 'failed', 'pending'];
      if (!validStatuses.includes(status)) {
        errors.push(`status must be one of: ${validStatuses.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateGetDevStatuses(req, res, next) {
    const errors = [];
    const { caseId } = req.params;

    if (!caseId) {
      errors.push('caseId is required');
    } else if (!Number.isInteger(parseInt(caseId, 10)) || parseInt(caseId, 10) <= 0) {
      errors.push('caseId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateDeleteDevStatus(req, res, next) {
    const errors = [];
    const { devStatusId } = req.params;

    if (!devStatusId) {
      errors.push('devStatusId is required');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  // CHANGE LOGS VALIDATION
  static validateGetChangeLogs(req, res, next) {
    const errors = [];
    const { caseId } = req.params;

    if (!caseId) {
      errors.push('caseId is required');
    } else if (!Number.isInteger(parseInt(caseId, 10)) || parseInt(caseId, 10) <= 0) {
      errors.push('caseId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  // RUN PLATFORM VALIDATION
  static validateGetRunPlatforms(req, res, next) {
    const errors = [];
    const { runId } = req.query;

    if (!runId) {
      errors.push('runId is required');
    } else if (!Number.isInteger(parseInt(runId, 10)) || parseInt(runId, 10) <= 0) {
      errors.push('runId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateUpdateRunPlatforms(req, res, next) {
    const errors = [];
    // Get runId from query params, body, or params
    const runId = req.query.runId || req.body?.runId || req.params?.runId;
    const { platformIds, platformId, isInclude } = req.body || {};

    if (!runId) {
      errors.push('runId is required');
    } else if (!Number.isInteger(parseInt(runId, 10)) || parseInt(runId, 10) <= 0) {
      errors.push('runId must be a positive integer');
    }

    // Handle single platform update validation
    if (platformId !== undefined && isInclude !== undefined) {
      if (typeof platformId !== 'string' || platformId.trim().length === 0) {
        errors.push('platformId must be a non-empty string (UUID)');
      }
      if (typeof isInclude !== 'boolean') {
        errors.push('isInclude must be a boolean');
      }
    }
    // Handle bulk platform update validation
    else if (platformIds !== undefined) {
      if (!Array.isArray(platformIds)) {
        errors.push('platformIds must be an array');
      } else {
        platformIds.forEach((id, index) => {
          if (typeof id !== 'string' || id.trim().length === 0) {
            errors.push(`platformIds[${index}] must be a non-empty string (UUID)`);
          }
        });
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  // INPUT SANITIZATION
  static sanitizeInput(req, res, next) {
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.trim().replace(/[\x00-\x1F\x7F]/g, '');
    };

    const sanitizeNumber = (num) => {
      if (num === undefined || num === null) return num;
      const parsed = parseInt(num, 10);
      return isNaN(parsed) ? num : parsed;
    };

    // Sanitize route parameters
    if (req.params) {
      if (req.params.projectId) {
        req.params.projectId = sanitizeNumber(req.params.projectId);
      }
      if (req.params.caseId) {
        req.params.caseId = sanitizeNumber(req.params.caseId);
      }
      if (req.params.devStatusId) {
        req.params.devStatusId = sanitizeString(req.params.devStatusId);
      }
    }

    // Sanitize query parameters
    if (req.query) {
      if (req.query.projectId) {
        req.query.projectId = sanitizeNumber(req.query.projectId);
      }
      if (req.query.runId) {
        req.query.runId = sanitizeNumber(req.query.runId);
      }
      if (req.query.email) {
        req.query.email = sanitizeString(req.query.email);
      }
    }

    // Sanitize body parameters
    if (req.body) {
      if (req.body.case_id) {
        req.body.case_id = sanitizeNumber(req.body.case_id);
      }
      if (req.body.role) {
        req.body.role = sanitizeString(req.body.role);
      }
      if (req.body.status) {
        req.body.status = sanitizeString(req.body.status);
      }
      if (req.body.platformIds && Array.isArray(req.body.platformIds)) {
        req.body.platformIds = req.body.platformIds.map(id => sanitizeString(id));
      }
      if (req.body.folderId) {
        req.body.folderId = sanitizeNumber(req.body.folderId);
      }
      if (req.body.platformId) {
        req.body.platformId = sanitizeString(req.body.platformId);
      }
    }

    next();
  }

  // FOLDER PLATFORM VALIDATION
  static validateGetFolderPlatforms(req, res, next) {
    const errors = [];
    const { folderId } = req.query;

    if (!folderId) {
      errors.push('folderId is required');
    } else if (!Number.isInteger(parseInt(folderId, 10)) || parseInt(folderId, 10) <= 0) {
      errors.push('folderId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateUpdateFolderPlatforms(req, res, next) {
    const errors = [];
    const { folderId, platformId, isInclude } = req.body;

    if (!folderId) {
      errors.push('folderId is required');
    } else if (!Number.isInteger(parseInt(folderId, 10)) || parseInt(folderId, 10) <= 0) {
      errors.push('folderId must be a positive integer');
    }

    if (!platformId) {
      errors.push('platformId is required');
    } else if (typeof platformId !== 'string' || platformId.trim().length === 0) {
      errors.push('platformId must be a non-empty string (UUID)');
    }

    if (isInclude === undefined || isInclude === null) {
      errors.push('isInclude is required');
    } else if (typeof isInclude !== 'boolean') {
      errors.push('isInclude must be a boolean');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }
}

module.exports = UtilitiesValidator; 