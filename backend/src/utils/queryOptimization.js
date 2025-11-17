/**
 * Query Optimization Utilities
 * Helper functions for optimizing MongoDB queries
 */

const logger = require('./logger');

/**
 * Build pagination object for queries
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Object} Pagination options
 */
const buildPagination = (page = 1, limit = 20) => {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

  return {
    skip: (validatedPage - 1) * validatedLimit,
    limit: validatedLimit,
    page: validatedPage,
  };
};

/**
 * Build sort object from query parameters
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Object} Sort object for Mongoose
 */
const buildSort = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const order = sortOrder === 'asc' ? 1 : -1;
  return { [sortBy]: order };
};

/**
 * Build filter object from query parameters
 * @param {Object} query - Query parameters
 * @param {Array} allowedFilters - Allowed filter fields
 * @returns {Object} Filter object for Mongoose
 */
const buildFilter = (query, allowedFilters = []) => {
  const filter = {};

  allowedFilters.forEach((field) => {
    if (query[field] !== undefined) {
      filter[field] = query[field];
    }
  });

  return filter;
};

/**
 * Build search filter for text search across multiple fields
 * @param {string} searchTerm - Search term
 * @param {Array} searchFields - Fields to search in
 * @returns {Object} MongoDB $or query
 */
const buildSearchFilter = (searchTerm, searchFields = []) => {
  if (!searchTerm || searchFields.length === 0) {
    return {};
  }

  const regex = new RegExp(searchTerm, 'i');
  return {
    $or: searchFields.map((field) => ({ [field]: regex })),
  };
};

/**
 * Build range filter for numeric or date fields
 * @param {string} field - Field name
 * @param {any} min - Minimum value
 * @param {any} max - Maximum value
 * @returns {Object} Range filter
 */
const buildRangeFilter = (field, min, max) => {
  const filter = {};

  if (min !== undefined && min !== null) {
    filter.$gte = min;
  }

  if (max !== undefined && max !== null) {
    filter.$lte = max;
  }

  return Object.keys(filter).length > 0 ? { [field]: filter } : {};
};

/**
 * Build date range filter
 * @param {string} field - Date field name
 * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
 * @returns {Object} Date range filter
 */
const buildDateFilter = (field, startDate, endDate) => {
  const filter = {};

  if (startDate) {
    filter.$gte = new Date(startDate);
  }

  if (endDate) {
    filter.$lte = new Date(endDate);
  }

  return Object.keys(filter).length > 0 ? { [field]: filter } : {};
};

/**
 * Execute query with pagination and return formatted response
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options (page, limit, sort, populate)
 * @returns {Promise<Object>} Paginated results
 */
const executePaginatedQuery = async (Model, filter, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    populate = [],
    select = null,
  } = options;

  const { skip, limit: validatedLimit } = buildPagination(page, limit);
  const sort = buildSort(sortBy, sortOrder);

  // Execute count and find queries in parallel
  const [total, docs] = await Promise.all([
    Model.countDocuments(filter),
    Model.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(validatedLimit)
      .populate(populate)
      .select(select)
      .lean(), // Use lean() for better performance if you don't need Mongoose documents
  ]);

  const totalPages = Math.ceil(total / validatedLimit);

  return {
    docs,
    pagination: {
      total,
      page: parseInt(page),
      pages: totalPages,
      limit: validatedLimit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Add indexes to model for common query patterns
 * @param {Model} Model - Mongoose model
 * @param {Array} indexes - Array of index definitions
 */
const addIndexes = async (Model, indexes = []) => {
  for (const index of indexes) {
    try {
      await Model.collection.createIndex(index.fields, index.options || {});
      logger.info(`Index created: ${JSON.stringify(index.fields)}`);
    } catch (error) {
      logger.error(`Failed to create index ${JSON.stringify(index.fields)}:`, error);
    }
  }
};

/**
 * Analyze query performance
 * @param {Query} query - Mongoose query
 * @returns {Promise<Object>} Query execution stats
 */
const analyzeQuery = async (query) => {
  const explained = await query.explain('executionStats');
  const stats = explained.executionStats;

  return {
    executionTimeMs: stats.executionTimeMs,
    totalDocsExamined: stats.totalDocsExamined,
    totalKeysExamined: stats.totalKeysExamined,
    nReturned: stats.nReturned,
    indexUsed: stats.executionStages?.indexName || 'COLLECTION_SCAN',
    efficient: stats.totalDocsExamined === stats.nReturned,
  };
};

/**
 * Batch operations helper
 * @param {Array} items - Items to process
 * @param {Function} operation - Operation to perform on each batch
 * @param {number} batchSize - Size of each batch
 * @returns {Promise<Array>} Results
 */
const batchOperation = async (items, operation, batchSize = 100) => {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);

    logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
  }

  return results;
};

module.exports = {
  buildPagination,
  buildSort,
  buildFilter,
  buildSearchFilter,
  buildRangeFilter,
  buildDateFilter,
  executePaginatedQuery,
  addIndexes,
  analyzeQuery,
  batchOperation,
};
