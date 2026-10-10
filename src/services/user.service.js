'use strict';

const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const { sanitizeUser, paginate, buildSortObject } = require('../utils/helpers');

exports.getAllUsers = async (filters = {}, page = 1, limit = 10, sort = '-createdAt') => {
  const query = {};

  if (filters.role) query.role = filters.role;

  // Filter by active status — accepts boolean or 'true'/'false' string
  if (filters.isActive !== undefined && filters.isActive !== '') {
    query.isActive =
      typeof filters.isActive === 'boolean'
        ? filters.isActive
        : filters.isActive === 'true';
  }

  if (filters.search && filters.search.trim()) {
    const regex = new RegExp(filters.search.trim(), 'i');
    query.$or = [{ name: regex }, { email: regex }];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const { skip } = paginate(null, parsedPage, parsedLimit);
  const sortObj = buildSortObject(sort || '-createdAt');

  const [users, totalRecords] = await Promise.all([
    User.find(query)
      .populate('manager', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    users: users.map(sanitizeUser),
    pagination: {
      currentPage: parsedPage,
      pageSize: parsedLimit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / parsedLimit),
    },
  };
};

exports.getUserById = async (id) => {
  const user = await User.findById(id).populate('manager', 'name email role');
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

exports.createUser = async (data) => {
  const user = await User.create(data);
  return sanitizeUser(user);
};

exports.updateUser = async (id, data, requesterId) => {
  // Hard strip of sensitive fields — these cannot be changed via this endpoint
  const safeData = { ...data };
  delete safeData.password;
  delete safeData.refreshToken;

  // Prevent admin from accidentally removing their own admin role
  if (String(id) === String(requesterId) && safeData.role && safeData.role !== 'admin') {
    throw new AppError('You cannot change your own role', 403);
  }

  const user = await User.findByIdAndUpdate(id, safeData, {
    new: true,
    runValidators: true,
  }).populate('manager', 'name email');

  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

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

exports.deleteUser = async (id, requesterId) => {
  if (String(id) === String(requesterId)) {
    throw new AppError('You cannot delete your own account', 403);
  }
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};
