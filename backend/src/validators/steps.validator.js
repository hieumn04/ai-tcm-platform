const ResponseUtil = require('../utils/response.util');

class StepsValidator {

  static validateUpdateSteps(req, res, next) {
    const errors = [];
    const { caseId } = req.query;
    const steps = req.body;

    // Validate caseId
    if (!caseId) {
      errors.push('caseId is required');
    } else if (!Number.isInteger(parseInt(caseId, 10)) || parseInt(caseId, 10) <= 0) {
      errors.push('caseId must be a positive integer');
    }

    // Validate steps array
    if (!Array.isArray(steps)) {
      errors.push('Steps must be an array');
    } else if (steps.length === 0) {
      errors.push('Steps array cannot be empty');
    } else {
      // Validate each step
      steps.forEach((step, index) => {
        // Validate editState
        const validEditStates = ['new', 'deleted', 'changed', 'notChanged'];
        if (!step.editState || !validEditStates.includes(step.editState)) {
          errors.push(`Step ${index + 1}: editState must be one of: ${validEditStates.join(', ')}`);
        }

        // Validation based on editState
        if (step.editState === 'new') {
          if (!step.step || typeof step.step !== 'string' || step.step.trim().length === 0) {
            errors.push(`Step ${index + 1}: step content is required and cannot be empty for new steps`);
          } else if (step.step.length > 2000) {
            errors.push(`Step ${index + 1}: step content must be less than 2000 characters`);
          }

          if (!step.result || typeof step.result !== 'string' || step.result.trim().length === 0) {
            errors.push(`Step ${index + 1}: result is required and cannot be empty for new steps`);
          } else if (step.result.length > 2000) {
            errors.push(`Step ${index + 1}: result must be less than 2000 characters`);
          }

          if (!step.caseSteps || step.caseSteps.stepNo === undefined) {
            errors.push(`Step ${index + 1}: caseSteps.stepNo is required for new steps`);
          } else if (!Number.isInteger(step.caseSteps.stepNo) || step.caseSteps.stepNo <= 0) {
            errors.push(`Step ${index + 1}: caseSteps.stepNo must be a positive integer`);
          }
        }

        if (step.editState === 'deleted' || step.editState === 'changed') {
          if (!step.id || !Number.isInteger(parseInt(step.id, 10)) || parseInt(step.id, 10) <= 0) {
            errors.push(`Step ${index + 1}: id is required and must be a positive integer for ${step.editState} steps`);
          }
        }

        if (step.editState === 'changed') {
          if (step.step !== undefined) {
            if (typeof step.step !== 'string' || step.step.trim().length === 0) {
              errors.push(`Step ${index + 1}: step content cannot be empty`);
            } else if (step.step.length > 2000) {
              errors.push(`Step ${index + 1}: step content must be less than 2000 characters`);
            }
          }

          if (step.result !== undefined) {
            if (typeof step.result !== 'string' || step.result.trim().length === 0) {
              errors.push(`Step ${index + 1}: result cannot be empty`);
            } else if (step.result.length > 2000) {
              errors.push(`Step ${index + 1}: result must be less than 2000 characters`);
            }
          }

          if (step.caseSteps && step.caseSteps.stepNo !== undefined) {
            if (!Number.isInteger(step.caseSteps.stepNo) || step.caseSteps.stepNo <= 0) {
              errors.push(`Step ${index + 1}: caseSteps.stepNo must be a positive integer`);
            }
          }
        }
      });

      // Validate unique stepNo for new and changed steps
      const stepNumbers = new Set();
      steps.forEach((step, index) => {
        if ((step.editState === 'new' || step.editState === 'changed') && step.caseSteps && step.caseSteps.stepNo) {
          if (stepNumbers.has(step.caseSteps.stepNo)) {
            errors.push(`Step ${index + 1}: Duplicate stepNo ${step.caseSteps.stepNo} found`);
          }
          stepNumbers.add(step.caseSteps.stepNo);
        }
      });
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
      const parsed = parseInt(num, 10);
      return isNaN(parsed) ? num : parsed;
    };

    // Sanitize query parameters
    if (req.query) {
      if (req.query.caseId) {
        req.query.caseId = sanitizeNumber(req.query.caseId);
      }
    }

    // Sanitize steps array
    if (req.body && Array.isArray(req.body)) {
      req.body = req.body.map(step => {
        const sanitizedStep = { ...step };
        
        if (sanitizedStep.step) {
          sanitizedStep.step = sanitizeString(sanitizedStep.step);
        }
        
        if (sanitizedStep.result) {
          sanitizedStep.result = sanitizeString(sanitizedStep.result);
        }
        
        if (sanitizedStep.id) {
          sanitizedStep.id = sanitizeNumber(sanitizedStep.id);
        }
        
        if (sanitizedStep.editState) {
          sanitizedStep.editState = sanitizeString(sanitizedStep.editState);
        }
        
        if (sanitizedStep.caseSteps && sanitizedStep.caseSteps.stepNo) {
          sanitizedStep.caseSteps.stepNo = sanitizeNumber(sanitizedStep.caseSteps.stepNo);
        }
        
        return sanitizedStep;
      });
    }

    next();
  }
}

module.exports = StepsValidator; 