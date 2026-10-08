'use strict';

/**
 * Centralized Express error handler — must be the last middleware (4-arg signature).
 *
 * Handles:
 *  - Invalid request (400) — Zod validation, Mongoose ValidationError, CastError
 *  - Unauthorized (401)   — JWT errors, missing/invalid token
 *  - Forbidden (403)      — AppError with 403
 *  - Not found (404)      — AppError with 404
 *  - Duplicate data (409) — MongoDB E11000
 *  - Database errors      — Mongoose/MongoDB operational errors
 *  - Unexpected errors (500) — any uncaught error
 *
 * Never exposes: stack traces (production), database internals, passwords,
 * or sensitive information in responses.
 */
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';
  let errors     = Array.isArray(err.errors) ? err.errors : [];

  // ── 1. Mongoose field-level ValidationError ──────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = 'Validation failed';
    errors     = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
  }

  // ── 2. Mongoose CastError (invalid ObjectId or type mismatch) ───────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid value for field "${err.path}": "${err.value}"`;
    errors     = [];
  }

  // ── 3. MongoDB duplicate key (E11000) ────────────────────────────────────
  if (err.code === 11000 || err.code === 11001) {
    statusCode = 409;
    const keyValue = err.keyValue || {};
    const field    = Object.keys(keyValue)[0] || 'field';
    const value    = keyValue[field];
    message  = value
      ? `${field} "${value}" already exists`
      : `Duplicate value for field: ${field}`;
    errors   = [{ field, message }];
  }

  // ── 4. JWT errors — treat as 401 Unauthorized ────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid authentication token';
    errors     = [];
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Authentication token has expired';
    errors     = [];
  }
  if (err.name === 'NotBeforeError') {
    statusCode = 401;
    message    = 'Authentication token not yet active';
    errors     = [];
  }

  // ── 5. Mongoose StrictModeError (writing to undefined schema fields) ─────
  if (err.name === 'StrictModeError') {
    statusCode = 400;
    message    = `Field "${err.path}" is not allowed`;
    errors     = [];
  }

  // ── 6. Generic MongoServerError (not duplicate key) ──────────────────────
  if (
    (err.name === 'MongoServerError' || err.name === 'MongoError') &&
    err.code !== 11000 &&
    err.code !== 11001
  ) {
    statusCode = 503;
    // Never expose internal MongoDB error details to client
    message = 'Database operation failed';
    errors  = [];
  }

  // ── 7. MongoDB connection errors ─────────────────────────────────────────
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    statusCode = 503;
    message    = 'Database connection error. Please try again later.';
    errors     = [];
  }

  // ── 8. Mongoose generic errors ───────────────────────────────────────────
  if (err.name === 'MongooseError') {
    statusCode = 500;
    message    = 'Database error occurred';
    errors     = [];
  }

  // ── 9. Payload too large ──────────────────────────────────────────────────
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message    = 'Request body is too large';
    errors     = [];
  }

  // ── 10. Unsupported media type ────────────────────────────────────────────
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message    = 'Invalid JSON in request body';
    errors     = [];
  }

  // ── Build consistent response ─────────────────────────────────────────────
  const isProd     = process.env.NODE_ENV === 'production';
  const isOpError  = err.isOperational === true;

  // In production: only expose operational error messages; mask unexpected errors
  if (isProd && !isOpError && statusCode >= 500) {
    message = 'Something went wrong. Please try again later.';
    errors  = [];
  }

  const response = {
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    // Stack trace only in development — never in production
    ...(!isProd && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};
