'use strict';

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';
  let errors     = Array.isArray(err.errors) ? err.errors : [];

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = 'Validation failed';
    errors     = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid value for field "${err.path}": "${err.value}"`;
    errors     = [];
  }

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

  if (err.name === 'StrictModeError') {
    statusCode = 400;
    message    = `Field "${err.path}" is not allowed`;
    errors     = [];
  }

  if (
    (err.name === 'MongoServerError' || err.name === 'MongoError') &&
    err.code !== 11000 &&
    err.code !== 11001
  ) {
    statusCode = 503;
    message = 'Database operation failed';
    errors  = [];
  }

  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    statusCode = 503;
    message    = 'Database connection error. Please try again later.';
    errors     = [];
  }

  if (err.name === 'MongooseError') {
    statusCode = 500;
    message    = 'Database error occurred';
    errors     = [];
  }

  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message    = 'Request body is too large';
    errors     = [];
  }

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message    = 'Invalid JSON in request body';
    errors     = [];
  }

  const isProd     = process.env.NODE_ENV === 'production';
  const isOpError  = err.isOperational === true;

  if (isProd && !isOpError && statusCode >= 500) {
    message = 'Something went wrong. Please try again later.';
    errors  = [];
  }

  const response = {
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(!isProd && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};
