'use strict';

const { z } = require('zod');

/**
 * Reusable validation primitives shared across all validators.
 * Import these instead of duplicating regex patterns.
 */

// MongoDB ObjectId: 24-char hex string
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
exports.objectIdRegex = objectIdRegex;

/**
 * Validates a MongoDB ObjectId string.
 * Usage: z.string().regex(objectIdRegex, 'Invalid ID')
 */
exports.objectIdSchema = z
  .string()
  .regex(objectIdRegex, 'Invalid ID format (must be a 24-character hex string)');

/**
 * Phone number validation.
 * Accepts international format: optional +, digits, spaces, hyphens, parentheses.
 * Examples: +1-800-555-1234, (555) 123-4567, +91 98765 43210
 * Min 7 digits, max 15 digits (ITU-T E.164).
 */
const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
exports.phoneRegex = phoneRegex;

exports.phoneSchema = z
  .string()
  .regex(phoneRegex, 'Invalid phone format. Use digits, spaces, hyphens, or parentheses (7–20 chars)')
  .optional();

/**
 * ISO date string — accepts YYYY-MM-DD or full ISO datetime.
 */
exports.dateStringSchema = z
  .string()
  .refine(
    (val) => !isNaN(new Date(val).getTime()),
    { message: 'Invalid date format' }
  )
  .optional();

/**
 * Future date check — rejects dates more than 1 day in the past.
 * Use as .superRefine(futureDateCheck).
 */
exports.futureDateCheck = (val, ctx) => {
  if (!val) return;
  const inputDate = new Date(val);
  if (isNaN(inputDate.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date format' });
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (inputDate < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected close date cannot be in the past',
    });
  }
};
