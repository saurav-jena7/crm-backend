'use strict';

const userService = require('../services/user.service');

/**
 * GET /api/users
 * Query params: page, limit, sort, role, isActive, search
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, sort, role, isActive, search } = req.query;

    const filters = {};
    if (role) filters.role = role;
    // Pass isActive as string; service coerces to boolean
    if (isActive !== undefined && isActive !== '') filters.isActive = isActive;
    if (search) filters.search = search;

    const result = await userService.getAllUsers(filters, page, limit, sort);

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: result.users,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users
 */
exports.createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user._id);
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/status
 * Body: { isActive: true | false }
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean (true or false)',
      });
    }
    const user = await userService.toggleUserStatus(req.params.id, isActive, req.user._id);
    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Soft-delete: sets isActive=false
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await userService.deleteUser(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      message: 'User deactivated (soft-deleted) successfully',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
