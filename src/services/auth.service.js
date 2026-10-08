'use strict';

const User = require('../models/User.model');
const jwtConfig = require('../config/jwt');
const AppError = require('../utils/AppError');
const { sanitizeUser } = require('../utils/helpers');

/**
 * Registers a new user.
 * @param {object} data - { name, email, password, role?, phone? }
 * @returns {{ user, accessToken, refreshToken }}
 */
exports.register = async (data) => {
  // Duplicate email is caught by the global errorHandler (mongo code 11000)
  const user = await User.create(data);

  const accessToken = jwtConfig.generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = jwtConfig.generateRefreshToken({ id: user._id });

  user.refreshToken = refreshToken;
  await user.save();

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

/**
 * Authenticates a user with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {{ user, accessToken, refreshToken }}
 */
exports.login = async (email, password) => {
  const user = await User.findOne({ email, isActive: true }).select('+password +refreshToken');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = jwtConfig.generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = jwtConfig.generateRefreshToken({ id: user._id });

  user.refreshToken = refreshToken;
  await user.save();

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

/**
 * Clears the refresh token stored on the user document (logout).
 * @param {string} userId
 */
exports.logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

/**
 * Rotates both tokens using a valid refresh token.
 * @param {string} token - The current refresh token.
 * @returns {{ accessToken, refreshToken }}
 */
exports.refreshTokens = async (token) => {
  const decoded = jwtConfig.verifyRefreshToken(token);

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new AppError('Invalid refresh token', 401);
  }

  const accessToken = jwtConfig.generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = jwtConfig.generateRefreshToken({ id: user._id });

  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken };
};
