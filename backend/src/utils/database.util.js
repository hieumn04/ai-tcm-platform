/**
 * Database utility functions for common operations
 */
class DatabaseUtil {
  /**
   * Create pagination metadata
   * @param {number} count - Total count of records
   * @param {number} page - Current page number
   * @param {number} limit - Records per page
   * @returns {Object} Pagination metadata
   */
  static createPagination(count, page = 1, limit = 10) {
    const parsedCount = Number(count) || 0;
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 10;
    
    if (parsedCount < 0) {
      throw new Error('Count must be a non-negative number');
    }
    
    if (parsedPage < 1) {
      throw new Error('Page must be a positive number');
    }
    
    if (parsedLimit < 1) {
      throw new Error('Limit must be a positive number');
    }
    
    const totalPages = Math.ceil(parsedCount / parsedLimit);
    const hasNext = parsedPage < totalPages;
    const hasPrev = parsedPage > 1;
    
    return {
      total: parsedCount,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      hasNext,
      hasPrev,
      offset: (parsedPage - 1) * parsedLimit
    };
  }

  /**
   * Build Sequelize sort order from query parameters
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - Sort direction (asc/desc)
   * @param {Array} allowedFields - Array of allowed sort fields
   * @param {string} defaultField - Default sort field
   * @returns {Array} Sequelize order array
   */
  static buildSortOrder(sortBy, sortOrder = 'asc', allowedFields = [], defaultField = 'id') {
    if (!Array.isArray(allowedFields)) {
      throw new Error('allowedFields must be an array');
    }
    
    const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
    const direction = ['asc', 'desc'].includes(sortOrder?.toLowerCase()) 
      ? sortOrder.toUpperCase() 
      : 'ASC';
    
    return [[field, direction]];
  }

  /**
   * Build where conditions for search queries
   * @param {string} searchTerm - Search term
   * @param {Array} searchFields - Fields to search in
   * @param {Object} Op - Sequelize operators
   * @param {string} dialect - Database dialect (postgres, mysql, sqlite, etc.)
   * @returns {Object} Where conditions
   */
  static buildSearchConditions(searchTerm, searchFields = [], Op, dialect = 'postgres') {
    if (!searchTerm || !searchFields.length) {
      return {};
    }

    if (!Array.isArray(searchFields)) {
      throw new Error('searchFields must be an array');
    }

    if (!Op) {
      throw new Error('Sequelize operators (Op) are required');
    }

    const likeOperator = dialect === 'postgres' ? Op.iLike : Op.like;
    const searchPattern = `%${searchTerm}%`;

    const searchConditions = searchFields.map(field => ({
      [field]: {
        [likeOperator]: searchPattern
      }
    }));

    return {
      [Op.or]: searchConditions
    };
  }

  /**
   * Execute transaction with automatic rollback on error
   * @param {Object} sequelize - Sequelize instance
   * @param {Function} callback - Function to execute in transaction
   * @returns {Promise} Transaction result
   */
  static async executeTransaction(sequelize, callback) {
    if (!sequelize) {
      throw new Error('Sequelize instance is required');
    }
    
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const transaction = await sequelize.transaction();
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Validate foreign key exists
   * @param {Object} Model - Sequelize model
   * @param {number} id - ID to validate
   * @param {string} entityName - Name for error messages
   * @throws {Error} If entity not found
   * @returns {Promise<Object>} The found entity
   */
  static async validateForeignKey(Model, id, entityName = 'Entity') {
    if (!Model) {
      throw new Error('Model is required');
    }
    
    if (!id) {
      throw new Error(`${entityName} ID is required`);
    }

    const entity = await Model.findByPk(id);
    if (!entity) {
      throw new Error(`${entityName} not found`);
    }

    return entity;
  }

  /**
   * Check if entity exists by conditions
   * @param {Object} Model - Sequelize model
   * @param {Object} conditions - Where conditions
   * @returns {Promise<boolean>} True if exists
   */
  static async exists(Model, conditions) {
    if (!Model) {
      throw new Error('Model is required');
    }
    
    if (!conditions || typeof conditions !== 'object') {
      throw new Error('Conditions must be an object');
    }
    
    try {
      const count = await Model.count({ where: conditions });
      return count > 0;
    } catch (error) {
      throw new Error(`Failed to check existence: ${error.message}`);
    }
  }

  /**
   * Safely build include array for Sequelize queries
   * @param {Array} includes - Array of include objects
   * @returns {Array} Validated include array
   */
  static buildIncludes(includes = []) {
    if (!Array.isArray(includes)) {
      throw new Error('Includes must be an array');
    }
    
    return includes.filter(include => include && typeof include === 'object');
  }

  /**
   * Build safe where conditions with sanitization
   * @param {Object} conditions - Raw conditions object
   * @param {Array} allowedFields - Fields allowed in where clause
   * @returns {Object} Sanitized where conditions
   */
  static buildSafeWhereConditions(conditions = {}, allowedFields = []) {
    if (!conditions || typeof conditions !== 'object') {
      return {};
    }
    
    if (!Array.isArray(allowedFields)) {
      throw new Error('allowedFields must be an array');
    }
    
    const safeConditions = {};
    
    Object.keys(conditions).forEach(field => {
      if (allowedFields.includes(field) && conditions[field] !== undefined) {
        safeConditions[field] = conditions[field];
      }
    });
    
    return safeConditions;
  }
}

module.exports = DatabaseUtil;