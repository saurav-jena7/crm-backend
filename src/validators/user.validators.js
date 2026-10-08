'use strict';

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/** Schema for admin POST /api/users — all fields required except phone/manager */
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain letters and numbers'),
  role: z.enum(['admin', 'sales_manager', 'sales_executive'], {
    required_error: 'Role is required',
  }),
  phone: z.string().optional(),
  manager: z.string().regex(objectIdRegex, 'Invalid manager ID').optional().nullable(),
});

/**
 * Schema for PUT /api/users/:id
 * Password is intentionally excluded — use change-password endpoint for that.
 */
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['admin', 'sales_manager', 'sales_executive']).optional(),
  phone: z.string().optional(),
  manager: z.string().regex(objectIdRegex, 'Invalid manager ID').optional().nullable(),
});

/** Schema for POST /api/users/change-password */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain letters and numbers'),
});

module.exports = { createUserSchema, updateUserSchema, changePasswordSchema };
