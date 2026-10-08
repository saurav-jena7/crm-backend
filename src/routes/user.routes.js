'use strict';

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/user.validators');

// All user routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// GET /api/users
router.get('/', userController.getAllUsers);

// POST /api/users
router.post('/', validate(createUserSchema), userController.createUser);

// GET /api/users/:id
router.get('/:id', userController.getUserById);

// PUT /api/users/:id
router.put('/:id', validate(updateUserSchema), userController.updateUser);

// PATCH /api/users/:id/status — activate or deactivate a user
router.patch('/:id/status', userController.toggleUserStatus);

// DELETE /api/users/:id
router.delete('/:id', userController.deleteUser);

module.exports = router;
