'use strict';

const { z } = require('zod');
const AppError = require('../utils/AppError');

/**
 * validate — middleware factory that parses req.body against a Zod schema.
 * On success the parsed (coerced) value replaces req.body.
 * On failure it calls next(AppError(400)) with field-level error details.
 *
 * @param {import('zod').ZodTypeAny} schema - A Zod schema to validate against.
 * @returns {Function} Express middleware (req, res, next).
 */
const validate = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.parseAsync(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new AppError('Validation failed', 400, errors));
    }
    next(err);
  }
};

module.exports = validate;
