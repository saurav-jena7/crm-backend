'use strict';

const authService = require('../services/auth.service');
const { sanitizeUser } = require('../utils/helpers');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    // Store refresh token in httpOnly cookie — never expose in body
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, accessToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    // Store refresh token in httpOnly cookie — never expose in body
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, accessToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    await authService.logout(req.user._id);
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh-token
 * Refresh token is read from the httpOnly cookie first, then req.body as fallback (for API clients).
 * Only the new accessToken is returned in the JSON body — refreshToken stays in the cookie only.
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token not provided' });
    }
    const { accessToken, refreshToken } = await authService.refreshTokens(token);
    // Rotate the refresh token cookie silently
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    // Only return accessToken in the body — never expose refreshToken in JSON
    res.status(200).json({ success: true, message: 'Token refreshed successfully', data: { accessToken } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: { user: sanitizeUser(req.user) } });
  } catch (err) {
    next(err);
  }
};
