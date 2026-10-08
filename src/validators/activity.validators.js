'use strict';

const { z } = require('zod');
const { objectIdRegex } = require('./common.validators');

/** Schema for POST /api/activities */
const createActivitySchema = z.object({
  type: z.enum(
    ['call', 'email', 'meeting', 'demo', 'follow_up', 'reminder', 'note'],
    { required_error: 'Activity type is required' }
  ),
  title:       z.string().min(1, 'Activity title is required'),
  description: z.string().optional(),
  assignedTo:  z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  // Accept any parseable date string — flexible for API clients
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

/**
 * Schema for PUT /api/activities/:id
 * relatedTo intentionally excluded — immutable after creation.
 */
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
  // relatedTo excluded — cannot change entity association after creation
});

module.exports = { createActivitySchema, updateActivitySchema };
