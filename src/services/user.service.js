'use strict';

const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const { sanitizeUser, paginate, buildSortObject } = require('../utils/helpers');

/**
 * Returns a paginated list of users with optional filtering.
 * @param {object} filters - { role?, isActive?, search? }
 * @param {number} page
 * @param {number} limit
 * @param {string} sort  - e.g. '-createdAt'
 * @returns {{ users, total, page, totalPages }}
 */
exports.getAllUsers = async (filters = {}, page = 1, limit = 10, sort = '-createdAt') => {
  const query = {};

  if (filters.role) query.role = filters.role;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;

  if (filters.search) {
    const regex = new RegExp(filters.search, 'i');
    query.$or = [{ name: regex }, { email: regex }];
  }

  const { skip, limit: parsedLimit } = paginate(null, page, limit);
  const sortObj = buildSortObject(sort);

  const [users, total] = await Promise.all([
    User.find(query).sort(sortObj).skip(skip).limit(parsedLimit),
    User.countDocuments(query),
  ]);

  return {
    users: users.map(sanitizeUser),
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
};

/**
 * Returns a single user by ID.
 * @param {string} id
 * @returns {object} Sanitized user
 */
exports.getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

/**
 * Creates a new user.
 * @param {object} data
 * @returns {object} Sanitized user
 */
exports.createUser = async (data) => {
  const user = await User.create(data);
  return sanitizeUser(user);
};

/**
 * Updates a user. Password changes are not allowed through this method.
 * @param {string} id
 * @param {object} data
 * @returns {object} Sanitized user
 */
exports.updateUser = async (id, data) => {
  // Never allow password changes through this pathway
  const safeData = { ...data };
  delete safeData.password;
  delete safeData.refreshToken;

  const user = await User.findByIdAndUpdate(id, safeData, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

/**
 * Toggles a user's active status (activate / deactivate).
 * Prevents an admin from deactivating themselves.
 *
 * @param {string} targetId  - ID of the user to toggle
 * @param {boolean} isActive - Desired active state
 * @param {string} requesterId - ID of the admin making the request
 * @returns {object} Sanitized updated user
 */
exports.toggleUserStatus = async (targetId, isActive, requesterId) => {
  if (String(targetId) === String(requesterId)) {
    throw new AppError('You cannot change your own active status', 403);
  }

  const user = await User.findByIdAndUpdate(
    targetId,
    { isActive },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

/**
 * Soft-deletes a user by setting isActive=false.
 * Prevents an admin from deleting themselves.
 *
 * @param {string} id
 * @param {string} requesterId
 * @returns {object} Sanitized (deactivated) user
 */
exports.deleteUser = async (id, requesterId) => {
  if (String(id) === String(requesterId)) {
    throw new AppError('You cannot delete your own account', 403);
  }
  const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};
