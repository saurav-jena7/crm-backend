'use strict';

const { z } = require('zod');
const AppError = require('../utils/AppError');

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
