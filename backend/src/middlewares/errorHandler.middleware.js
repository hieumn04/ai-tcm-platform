const ResponseUtil = require('../utils/response.util');

function errorHandlerMiddleware() {
  return function globalErrorHandler(error, req, res, next) {


    if (error.name === 'ValidationError') {
      return ResponseUtil.validationError(res, error.details || [error.message]);
    }

    if (error.name === 'UnauthorizedError') {
      return ResponseUtil.authError(res, error.message);
    }

    if (error.name === 'ForbiddenError') {
      return ResponseUtil.forbiddenError(res, error.message);
    }

    if (error.name === 'NotFoundError') {
      return ResponseUtil.notFound(res, error.message);
    }

    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      return ResponseUtil.validationError(res, validationErrors);
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return ResponseUtil.error(res, 'Resource already exists', 409);
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return ResponseUtil.error(res, 'Invalid reference to related resource', 400);
    }

    return ResponseUtil.serverError(res, error);
  };
}

module.exports = errorHandlerMiddleware; 