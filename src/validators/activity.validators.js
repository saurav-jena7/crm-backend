'use strict';

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/** Schema for POST /api/activities */
const createActivitySchema = z.object({
  type: z.enum(
    ['call', 'email', 'meeting', 'demo', 'follow_up', 'reminder', 'note'],
    { required_error: 'Activity type is required' }
  ),
  title:       z.string().min(1, 'Activity title is required'),
  description: z.string().optional(),
  assignedTo:  z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  dueDate:     z.string().optional(), // ISO date string — flexible format
  // relatedTo is optional — a reminder or note may be user-level only
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
 * All fields optional. relatedTo cannot change entity type after creation
 * (prevents orphaned timeline entries).
 */
const updateActivitySchema = z.object({
  type:        z.enum(['call', 'email', 'meeting', 'demo', 'follow_up', 'reminder', 'note']).optional(),
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  assignedTo:  z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  dueDate:     z.string().optional(),
  status:      z.enum(['pending', 'completed', 'overdue']).optional(),
  // relatedTo intentionally excluded from updates — set at creation only
});

module.exports = { createActivitySchema, updateActivitySchema };
