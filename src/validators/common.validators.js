'use strict';

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
exports.objectIdRegex = objectIdRegex;

exports.objectIdSchema = z
  .string()
  .regex(objectIdRegex, 'Invalid ID format (must be a 24-character hex string)');

const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
exports.phoneRegex = phoneRegex;

exports.phoneSchema = z
  .string()
  .regex(phoneRegex, 'Invalid phone format. Use digits, spaces, hyphens, or parentheses (7–20 chars)')
  .optional();

exports.dateStringSchema = z
  .string()
  .refine(
    (val) => !isNaN(new Date(val).getTime()),
    { message: 'Invalid date format' }
  )
  .optional();

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
