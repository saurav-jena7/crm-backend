'use strict';

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

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
  value: z
    .number({ required_error: 'Value is required' })
    .positive('Deal value must be greater than 0'),
  probability: z
    .number()
    .min(0,   'Probability cannot be negative')
    .max(100, 'Probability cannot exceed 100')
    .optional(),
  expectedCloseDate: z.string().optional(),
  // stage intentionally omitted — use PATCH /api/deals/:id/stage to transition stages
  description: z.string().optional(),
});

/** Schema for PATCH /api/deals/:id — stage is excluded; use the dedicated stage endpoint */
const updateDealSchema = createDealSchema.partial();

/**
 * Schema for PATCH /api/deals/:id/stage
 * Uses superRefine to enforce stage-specific requirements:
 *  - 'lost' requires lostReason
 *  - 'won'  requires expectedCloseDate
 */
const updateStageSchema = z
  .object({
    stage: dealStageEnum,
    lostReason: z.string().optional(),
    value: z.number().positive('Value must be positive').optional(),
    probability: z
      .number()
      .min(0, 'Probability cannot be negative')
      .max(100, 'Probability cannot exceed 100')
      .optional(),
    expectedCloseDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.stage === 'lost' && !data.lostReason) {
      ctx.addIssue({
        path: ['lostReason'],
        message: 'lostReason required when stage is lost',
        code: z.ZodIssueCode.custom,
      });
    }
    if (data.stage === 'won' && !data.expectedCloseDate) {
      ctx.addIssue({
        path: ['expectedCloseDate'],
        message: 'expectedCloseDate required when stage is won',
        code: z.ZodIssueCode.custom,
      });
    }
  });

module.exports = { createDealSchema, updateDealSchema, updateStageSchema };
