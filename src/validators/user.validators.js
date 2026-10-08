'use strict';

const { z } = require('zod');

/** Schema for admin POST /api/users — role is required here */
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
});

/** Schema for PATCH /api/users/:id — all fields optional */
const updateUserSchema = createUserSchema.partial();

/** Schema for POST /api/users/change-password */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain letters and numbers'),
});

module.exports = { createUserSchema, updateUserSchema, changePasswordSchema };
