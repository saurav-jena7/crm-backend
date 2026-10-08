'use strict';

const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * Generates a short-lived access token.
 * @param {object} payload - Data to encode (typically { id, role }).
 * @returns {string} Signed JWT string.
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * Generates a long-lived refresh token.
 * @param {object} payload - Data to encode.
 * @returns {string} Signed JWT string.
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verifies an access token and returns its decoded payload.
 * @param {string} token
 * @returns {object} Decoded payload.
 * @throws {AppError} 401 if the token is invalid or expired.
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired access token', 401);
  }
}

/**
 * Verifies a refresh token and returns its decoded payload.
 * @param {string} token
 * @returns {object} Decoded payload.
 * @throws {AppError} 401 if the token is invalid or expired.
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
