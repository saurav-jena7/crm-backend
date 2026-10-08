'use strict';

const userService = require('../services/user.service');

/**
 * GET /api/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, sort, role, isActive, search } = req.query;
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;

    const result = await userService.getAllUsers(filters, page, limit, sort);
    res.status(200).json({ success: true, data: result });
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
    res.status(200).json({ success: true, data: { user } });
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
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/status
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
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
 */
exports.deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user._id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
