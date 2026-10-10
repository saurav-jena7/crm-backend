'use strict';

const { z } = require('zod');
const { phoneSchema } = require('./common.validators');

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain letters and numbers'),
  role:  z.enum(['admin', 'sales_manager', 'sales_executive']).optional(),
  phone: phoneSchema,
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

module.exports = { registerSchema, loginSchema, refreshTokenSchema };
