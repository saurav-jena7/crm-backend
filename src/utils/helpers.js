'use strict';

function paginate(query, page = 1, limit = 10) {
  const parsedLimit = parseInt(limit, 10);
  const parsedPage = parseInt(page, 10);
  return {
    skip: (parsedPage - 1) * parsedLimit,
    limit: parsedLimit,
  };
}

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

function sanitizeUser(userDoc) {
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  delete obj.refreshToken;
  return obj;
}

function isOverdue(dueDate, status) {
  return dueDate < new Date() && status === 'pending';
}

module.exports = {
  paginate,
  buildSortObject,
  sanitizeUser,
  isOverdue,
};
