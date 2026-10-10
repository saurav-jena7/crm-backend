'use strict';

const { z } = require('zod');
const { objectIdRegex, phoneSchema } = require('./common.validators');

const createLeadSchema = z.object({
  name:    z.string().min(1, 'Lead name is required'),
  email:   z.string().email('Invalid email address').optional(),
  phone:   phoneSchema,
  company: z.string().optional(),
  source:  z.enum(['website', 'referral', 'social_media', 'email', 'phone', 'other']).optional(),
  // 'converted' is set only by the convert endpoint, not here
  status: z
    .enum(['new', 'contacted', 'qualified', 'unqualified', 'lost'])
    .optional(),
  priority:   z.enum(['low', 'medium', 'high']).optional(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  description: z.string().optional(),
});

const updateLeadStatusSchema = z.object({
  // 'converted' is blocked here — must use the convert endpoint
  status: z.enum(
    ['new', 'contacted', 'qualified', 'unqualified', 'lost'],
    { required_error: 'Status is required' }
  ),
});

const updateLeadSchema = z.object({
  name:    z.string().min(1, 'Lead name cannot be empty').optional(),
  email:   z.string().email('Invalid email address').optional(),
  phone:   phoneSchema,
  company: z.string().optional(),
  source:  z.enum(['website', 'referral', 'social_media', 'email', 'phone', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  description: z.string().optional(),
  // assignedTo and status intentionally excluded from general update
});

const assignLeadSchema = z.object({
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID'),
});

const convertLeadSchema = z.object({
  dealTitle: z.string().min(1, 'Deal title is required'),
  dealValue: z
    .number({ required_error: 'Deal value is required' })
    .positive('Deal value must be positive'),
  dealStage: z
    .enum(['qualification', 'discovery', 'proposal', 'negotiation'])
    .optional(),
  expectedCloseDate: z.string().optional(),
  customerData: z
    .object({
      name:    z.string().min(1, 'Customer name is required').optional(),
      email:   z.string().email('Invalid email address').optional(),
      phone:   phoneSchema,
      company: z.string().optional(),
    })
    .optional(),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
  convertLeadSchema,
};
