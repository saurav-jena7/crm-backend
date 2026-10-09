'use strict';

const { z } = require('zod');
const { objectIdRegex, futureDateCheck } = require('./common.validators');

const dealStageEnum = z.enum([
  'qualification',
  'discovery',
  'proposal',
  'negotiation',
  'won',
  'lost',
]);

/** Schema for POST /api/deals */
const createDealSchema = z.object({
  title:      z.string().min(1, 'Deal title is required'),
  lead:       z.string().regex(objectIdRegex, 'Invalid lead ID').optional(),
  customer:   z.string().regex(objectIdRegex, 'Invalid customer ID').optional(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  // Deal value must be > 0
  value: z
    .number({ required_error: 'Deal value is required' })
    .positive('Deal value must be greater than 0'),
  // Probability 0–100
  probability: z
    .number()
    .min(0,   'Probability cannot be negative')
    .max(100, 'Probability cannot exceed 100')
    .optional(),
  // Date cannot be in the past
  expectedCloseDate: z.string().optional().superRefine(futureDateCheck),
  // stage intentionally omitted — use PATCH /deals/:id/stage
  description: z.string().optional(),
});

/** Schema for PUT /api/deals/:id — stage excluded, use dedicated endpoint */
const updateDealSchema = z.object({
  title:       z.string().min(1).optional(),
  lead:        z.string().regex(objectIdRegex, 'Invalid lead ID').optional(),
  customer:    z.string().regex(objectIdRegex, 'Invalid customer ID').optional(),
  assignedTo:  z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  value:       z.number().positive('Deal value must be greater than 0').optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional().superRefine(futureDateCheck),
  description: z.string().optional(),
}).strict(); // .strict() rejects any unknown fields — including 'stage'

/**
 * Schema for PATCH /api/deals/:id/stage
 * Enforces stage transition business rules:
 *  - 'won'  → requires expectedCloseDate
 *  - 'lost' → requires lostReason
 */
const updateStageSchema = z
  .object({
    stage:      dealStageEnum,
    lostReason: z.string().min(1, 'Lost reason cannot be empty').optional(),
    value:      z.number().positive('Value must be positive').optional(),
    probability: z
      .number()
      .min(0,   'Probability cannot be negative')
      .max(100, 'Probability cannot exceed 100')
      .optional(),
    expectedCloseDate: z.string().optional().superRefine(futureDateCheck),
  })
  .superRefine((data, ctx) => {
    if (data.stage === 'lost' && !data.lostReason) {
      ctx.addIssue({
        path:    ['lostReason'],
        code:    z.ZodIssueCode.custom,
        message: 'lostReason is required when moving a deal to Lost',
      });
    }
    if (data.stage === 'won' && !data.expectedCloseDate) {
      ctx.addIssue({
        path:    ['expectedCloseDate'],
        code:    z.ZodIssueCode.custom,
        message: 'expectedCloseDate is required when marking a deal as Won',
      });
    }
    // Probability must be 100 when marking Won
    if (data.stage === 'won' && data.probability !== undefined && data.probability !== 100) {
      ctx.addIssue({
        path:    ['probability'],
        code:    z.ZodIssueCode.custom,
        message: 'Probability must be 100 when marking a deal as Won',
      });
    }
  });

module.exports = { createDealSchema, updateDealSchema, updateStageSchema };
