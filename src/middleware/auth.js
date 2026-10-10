'use strict';

const { verifyAccessToken } = require('../config/jwt');
const AppError = require('../utils/AppError');
const User = require('../models/User.model');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('+isActive');
    if (!user || !user.isActive) {
      return next(new AppError('Unauthorized', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Forbidden', 403));
  }
  next();
};

module.exports = { authenticate, authorize };
