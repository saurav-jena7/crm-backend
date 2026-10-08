'use strict';

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/** Schema for POST /api/leads */
const createLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z
    .enum(['website', 'referral', 'social_media', 'email', 'phone', 'other'])
    .optional(),
  status: z
    .enum(['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedTo: z
    .string()
    .regex(objectIdRegex, 'Invalid user ID')
    .optional(),
  description: z.string().optional(),
});

/** Schema for PATCH /api/leads/:id */
const updateLeadSchema = createLeadSchema.partial();

/** Schema for PATCH /api/leads/:id/assign */
const assignLeadSchema = z.object({
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID'),
});

/** Schema for POST /api/leads/:id/convert */
const convertLeadSchema = z.object({
  dealTitle: z.string().min(1, 'Deal title is required'),
  dealValue: z.number({ required_error: 'Deal value is required' }).positive('Deal value must be positive'),
  dealStage: z
    .enum(['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'])
    .optional(),
  expectedCloseDate: z.string().datetime({ message: 'Invalid date-time format' }).optional(),
  customerData: z
    .object({
      name: z.string().min(1, 'Customer name is required'),
      email: z.string().email('Invalid email address').optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
    })
    .optional(),
});

module.exports = { createLeadSchema, updateLeadSchema, assignLeadSchema, convertLeadSchema };
