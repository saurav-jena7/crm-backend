'use strict';

/**
 * Returns skip/limit values for Mongoose pagination queries.
 * @param {object|string} query - Ignored; kept for API symmetry.
 * @param {number} page  - 1-based page number (default: 1).
 * @param {number} limit - Items per page (default: 10).
 * @returns {{ skip: number, limit: number }}
 */
function paginate(query, page = 1, limit = 10) {
  const parsedLimit = parseInt(limit, 10);
  const parsedPage = parseInt(page, 10);
  return {
    skip: (parsedPage - 1) * parsedLimit,
    limit: parsedLimit,
  };
}

/**
 * Converts a sort string like 'field,-field2' into a Mongoose sort object.
 * A leading '-' denotes descending order.
 * @param {string} sortStr - Comma-separated field names, '-' prefix = desc.
 * @returns {object} e.g. { field: 1, field2: -1 }
 */
function buildSortObject(sortStr) {
  if (!sortStr || typeof sortStr !== 'string') return {};

  return sortStr.split(',').reduce((acc, field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      acc[trimmed.slice(1)] = -1;
    } else {
      acc[trimmed] = 1;
    }
    return acc;
  }, {});
}

/**
 * Returns a plain object representation of a Mongoose user document
 * with sensitive fields removed.
 * @param {object} userDoc - A Mongoose User document.
 * @returns {object} Plain user object without password or refreshToken.
 */
function sanitizeUser(userDoc) {
  const obj = userDoc.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
}

/**
 * Determines whether an activity is overdue.
 * @param {Date}   dueDate - The activity's due date.
 * @param {string} status  - The activity's current status.
 * @returns {boolean} True only when dueDate is in the past and status is 'pending'.
 */
function isOverdue(dueDate, status) {
  return dueDate < new Date() && status === 'pending';
}

module.exports = {
  paginate,
  buildSortObject,
  sanitizeUser,
  isOverdue,
};
