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

const createDealSchema = z.object({
  title:      z.string().min(1, 'Deal title is required'),
  lead:       z.string().regex(objectIdRegex, 'Invalid lead ID').optional(),
  customer:   z.string().regex(objectIdRegex, 'Invalid customer ID').optional(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  value: z
    .number({ required_error: 'Deal value is required' })
    .positive('Deal value must be greater than 0'),
  probability: z
    .number()
    .min(0,   'Probability cannot be negative')
    .max(100, 'Probability cannot exceed 100')
    .optional(),
  expectedCloseDate: z.string().optional().superRefine(futureDateCheck),
  // stage intentionally omitted — use PATCH /deals/:id/stage
  description: z.string().optional(),
});

// stage excluded — use dedicated endpoint
const updateDealSchema = z.object({
  title:       z.string().min(1).optional(),
  lead:        z.string().regex(objectIdRegex, 'Invalid lead ID').optional(),
  customer:    z.string().regex(objectIdRegex, 'Invalid customer ID').optional(),
  assignedTo:  z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  value:       z.number().positive('Deal value must be greater than 0').optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional().superRefine(futureDateCheck),
  description: z.string().optional(),
}).strict();

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
    if (data.stage === 'won' && data.probability !== undefined && data.probability !== 100) {
      ctx.addIssue({
        path:    ['probability'],
        code:    z.ZodIssueCode.custom,
        message: 'Probability must be 100 when marking a deal as Won',
      });
    }
  });

module.exports = { createDealSchema, updateDealSchema, updateStageSchema };
