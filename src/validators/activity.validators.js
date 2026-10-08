'use strict';

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/** Schema for POST /api/activities */
const createActivitySchema = z.object({
  type: z.enum(
    ['call', 'email', 'meeting', 'demo', 'follow_up', 'reminder', 'note'],
    { required_error: 'Activity type is required' }
  ),
  title: z.string().min(1, 'Activity title is required'),
  description: z.string().optional(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  dueDate: z.string().datetime({ message: 'Invalid date-time format' }).optional(),
  relatedTo: z.object({
    entityId: z.string().regex(objectIdRegex, 'Invalid entity ID'),
    entityType: z.enum(['lead', 'customer', 'deal'], {
      required_error: 'entityType is required',
    }),
  }),
});

/** Schema for PATCH /api/activities/:id */
const updateActivitySchema = createActivitySchema.partial();

module.exports = { createActivitySchema, updateActivitySchema };
