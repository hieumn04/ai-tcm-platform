const ResponseUtil = require('../utils/response.util');

class RunCasesValidator {

  static validateAddCases(req, res, next) {
    const errors = [];
    const { runId, projectId } = req.query;
    const { caseIds, customRunName, selectAllPages, folderId, description } = req.body;

    if (!runId && !customRunName) {
      errors.push('Either runId or customRunName is required');
    }

    if (!runId && !projectId) {
      errors.push('projectId is required when creating a new run');
    }

    if (selectAllPages) {
      if (!folderId) {
        errors.push('folderId is required when selectAllPages is true');
      }
    } else {
      if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
        errors.push('caseIds must be a non-empty array when not selecting all pages');
      } else if (caseIds.some(id => !Number.isInteger(parseInt(id)) || parseInt(id) <= 0)) {
        errors.push('All caseIds must be positive integers');
      }
    }

    if (runId && (!Number.isInteger(parseInt(runId)) || parseInt(runId) <= 0)) {
      errors.push('runId must be a positive integer');
    }

    if (projectId && (!Number.isInteger(parseInt(projectId)) || parseInt(projectId) <= 0)) {
      errors.push('projectId must be a positive integer');
    }

    if (folderId && (!Number.isInteger(parseInt(folderId)) || parseInt(folderId) <= 0)) {
      errors.push('folderId must be a positive integer');
    }

    if (customRunName && typeof customRunName !== 'string') {
      errors.push('customRunName must be a string');
    }

    if (description && typeof description !== 'string') {
      errors.push('description must be a string');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateUpdateStatuses(req, res, next) {
    const errors = [];
    const { runId } = req.query;
    const { runCases } = req.body;

    if (!runId) {
      errors.push('runId is required');
    } else if (!Number.isInteger(parseInt(runId)) || parseInt(runId) <= 0) {
      errors.push('runId must be a positive integer');
    }

    if (!runCases || !Array.isArray(runCases)) {
      errors.push('runCases must be an array');
    } else if (runCases.length === 0) {
      errors.push('runCases array cannot be empty');
    } else {
      runCases.forEach((runCase, index) => {
        if (!runCase.caseId) {
          errors.push(`runCases[${index}].caseId is required`);
        } else if (!Number.isInteger(parseInt(runCase.caseId)) || parseInt(runCase.caseId) <= 0) {
          errors.push(`runCases[${index}].caseId must be a positive integer`);
        }

        if (runCase.statuses) {
          if (!Array.isArray(runCase.statuses)) {
            errors.push(`runCases[${index}].statuses must be an array`);
          } else {
            runCase.statuses.forEach((status, statusIndex) => {
              if (!status.platform || typeof status.platform !== 'string') {
                errors.push(`runCases[${index}].statuses[${statusIndex}].platform is required and must be a string`);
              }

              if (status.status === undefined || status.status === null) {
                errors.push(`runCases[${index}].statuses[${statusIndex}].status is required`);
              } else if (!Number.isInteger(parseInt(status.status)) || parseInt(status.status) < 0) {
                errors.push(`runCases[${index}].statuses[${statusIndex}].status must be a non-negative integer`);
              }
            });
          }
        }
      });
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateRemoveCases(req, res, next) {
    const errors = [];
    const { runId } = req.query;
    const { caseIds, runCaseIds } = req.body;

    if (!runId) {
      errors.push('runId is required');
    } else if (!Number.isInteger(parseInt(runId)) || parseInt(runId) <= 0) {
      errors.push('runId must be a positive integer');
    }

    const hasCaseIds = caseIds && Array.isArray(caseIds) && caseIds.length > 0;
    const hasRunCaseIds = runCaseIds && Array.isArray(runCaseIds) && runCaseIds.length > 0;

    if (!hasCaseIds && !hasRunCaseIds) {
      errors.push('Either caseIds or runCaseIds must be a non-empty array');
    } else {
      if (hasCaseIds && caseIds.some(id => !Number.isInteger(parseInt(id)) || parseInt(id) <= 0)) {
        errors.push('All caseIds must be positive integers');
      }
      if (hasRunCaseIds && runCaseIds.some(id => !Number.isInteger(parseInt(id)) || parseInt(id) <= 0)) {
        errors.push('All runCaseIds must be positive integers');
      }
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateListRunCases(req, res, next) {
    const errors = [];
    const { runId } = req.query;

    if (!runId) {
      errors.push('runId is required');
    } else if (!Number.isInteger(parseInt(runId)) || parseInt(runId) <= 0) {
      errors.push('runId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateGetRunCasesByRunId(req, res, next) {
    const errors = [];
    const { runId, page, limit, sortColumn, sortDirection } = req.query;

    if (!runId) {
      errors.push('runId is required');
    } else if (!Number.isInteger(parseInt(runId)) || parseInt(runId) <= 0) {
      errors.push('runId must be a positive integer');
    }

    if (page && (!Number.isInteger(parseInt(page)) || parseInt(page) < 1)) {
      errors.push('page must be a positive integer');
    }

    if (limit && (!Number.isInteger(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      errors.push('limit must be a positive integer between 1 and 100');
    }

    if (sortColumn && typeof sortColumn !== 'string') {
      errors.push('sortColumn must be a string');
    }

    if (sortDirection && !['ASC', 'DESC', 'asc', 'desc'].includes(sortDirection)) {
      errors.push('sortDirection must be ASC or DESC');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static sanitizeInput(req, res, next) {
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.trim().replace(/[\x00-\x1F\x7F]/g, '');
    };

    const sanitizeNumber = (num) => {
      if (num === undefined || num === null) return num;
      const parsed = parseInt(num);
      return isNaN(parsed) ? num : parsed;
    };

    if (req.body) {
      if (req.body.customRunName) {
        req.body.customRunName = sanitizeString(req.body.customRunName);
      }
      if (req.body.description) {
        req.body.description = sanitizeString(req.body.description);
      }
      if (req.body.folderId) {
        req.body.folderId = sanitizeNumber(req.body.folderId);
      }
      if (req.body.caseIds && Array.isArray(req.body.caseIds)) {
        req.body.caseIds = req.body.caseIds.map(id => sanitizeNumber(id));
      }
      if (req.body.runCases && Array.isArray(req.body.runCases)) {
        req.body.runCases = req.body.runCases.map(runCase => ({
          ...runCase,
          caseId: sanitizeNumber(runCase.caseId),
          statuses: runCase.statuses ? runCase.statuses.map(status => ({
            ...status,
            platform: sanitizeString(status.platform),
            status: sanitizeNumber(status.status),
          })) : runCase.statuses,
        }));
      }
    }

    if (req.query) {
      if (req.query.runId) {
        req.query.runId = sanitizeNumber(req.query.runId);
      }
      if (req.query.projectId) {
        req.query.projectId = sanitizeNumber(req.query.projectId);
      }
      if (req.query.page) {
        req.query.page = sanitizeNumber(req.query.page);
      }
      if (req.query.limit) {
        req.query.limit = sanitizeNumber(req.query.limit);
      }
      if (req.query.search) {
        req.query.search = sanitizeString(req.query.search);
      }
      if (req.query.sortColumn) {
        req.query.sortColumn = sanitizeString(req.query.sortColumn);
      }
      if (req.query.sortDirection) {
        req.query.sortDirection = sanitizeString(req.query.sortDirection);
      }
    }

    if (req.params) {
      if (req.params.runId) {
        req.params.runId = sanitizeNumber(req.params.runId);
      }
    }

    next();
  }
}

module.exports = RunCasesValidator; 