'use strict';

const { z } = require('zod');
const { objectIdRegex } = require('./common.validators');

const createActivitySchema = z.object({
  type: z.enum(
    ['call', 'email', 'meeting', 'demo', 'follow_up', 'reminder', 'note'],
    { required_error: 'Activity type is required' }
  ),
  title:       z.string().min(1, 'Activity title is required'),
  description: z.string().optional(),
  assignedTo:  z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  dueDate: z
    .string()
    .refine(
      (val) => !val || !isNaN(new Date(val).getTime()),
      { message: 'Invalid date format for dueDate' }
    )
    .optional(),
  // relatedTo is optional — user-level reminders/notes may not link to an entity
  relatedTo: z
    .object({
      entityId:   z.string().regex(objectIdRegex, 'Invalid entity ID'),
      entityType: z.enum(['lead', 'customer', 'deal', 'user'], {
        required_error: 'entityType must be lead, customer, deal, or user',
      }),
    })
    .optional(),
});

// relatedTo intentionally excluded — immutable after creation
const updateActivitySchema = z.object({
  type:  z.enum(['call', 'email', 'meeting', 'demo', 'follow_up', 'reminder', 'note']).optional(),
  title: z.string().min(1, 'Activity title cannot be empty').optional(),
  description: z.string().optional(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  dueDate: z
    .string()
    .refine(
      (val) => !val || !isNaN(new Date(val).getTime()),
      { message: 'Invalid date format for dueDate' }
    )
    .optional(),
  // status can be updated manually (e.g. reopen a completed activity)
  status: z.enum(['pending', 'completed', 'overdue']).optional(),
});

module.exports = { createActivitySchema, updateActivitySchema };
