/**
 * Utility functions for standardized API responses
 */
class ResponseUtil {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      ...(data && { data })
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Array|null} details - Error details array or null
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
    const response = {
      success: false,
      error: message,
      ...(details && { details })
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response object
   * @param {Array} errors - Array of validation errors
   * @param {string} message - Main error message
   */
  static validationError(res, errors, message = 'Validation failed') {
    return ResponseUtil.error(res, message, 400, errors);
  }

  /**
   * Send authentication error response
   * @param {Object} res - Express response object
   * @param {string} message - Auth error message
   */
  static authError(res, message = 'Authentication failed') {
    return ResponseUtil.error(res, message, 401);
  }

  /**
   * Send authorization error response
   * @param {Object} res - Express response object
   * @param {string} message - Authorization error message
   */
  static forbiddenError(res, message = 'Access forbidden') {
    return ResponseUtil.error(res, message, 403);
  }

  /**
   * Send not found error response
   * @param {Object} res - Express response object
   * @param {string} message - Not found message
   */
  static notFound(res, message = 'Resource not found') {
    return ResponseUtil.error(res, message, 404);
  }

  /**
   * Send created response
   * @param {Object} res - Express response object
   * @param {Object} data - Created resource data
   * @param {string} message - Success message
   */
  static created(res, data, message = 'Resource created successfully') {
    return ResponseUtil.success(res, data, message, 201);
  }

  /**
   * Send no content response
   * @param {Object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send paginated response
   * @param {Object} res - Express response object
   * @param {Array} items - Array of items
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Success message
   */
  static paginated(res, items, pagination, message = 'Data retrieved successfully') {
    const response = {
      success: true,
      message,
      data: items,
      pagination: {
        total: pagination.total || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
      }
    };
    
    return res.status(200).json(response);
  }

  /**
   * Handle async errors in route handlers
   * @param {Function} fn - Async function to wrap
   * @returns {Function} - Wrapped function with error handling
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Send server error with logging
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} message - Custom error message
   */
  static serverError(res, error, message = 'Internal Server Error') {
    const response = {
      success: false,
      error: message,
      details: error instanceof Error ? error.message : 'An unexpected error occurred'};
    
    return res.status(500).json(response);
  }
}

module.exports = ResponseUtil; 