'use strict';

const Config = require('../models/Config.model');
const AppError = require('../utils/AppError');

/**
 * GET /api/config
 * Returns all CRM configuration settings.
 */
exports.getAllConfig = async (req, res, next) => {
  try {
    const configs = await Config.find().sort({ key: 1 });
    res.status(200).json({ success: true, message: 'Config fetched successfully', data: { configs } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/config/:key
 * Returns a single config by key.
 */
exports.getConfig = async (req, res, next) => {
  try {
    const config = await Config.findOne({ key: req.params.key });
    if (!config) throw new AppError(`Config key '${req.params.key}' not found`, 404);
    res.status(200).json({ success: true, data: { config } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/config
 * Creates or updates a config entry (upsert by key).
 */
exports.setConfig = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      throw new AppError('key and value are required', 400);
    }

    const config = await Config.findOneAndUpdate(
      { key },
      { value, description, updatedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Config saved successfully', data: { config } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/config/:key
 * Deletes a config entry.
 */
exports.deleteConfig = async (req, res, next) => {
  try {
    const config = await Config.findOneAndDelete({ key: req.params.key });
    if (!config) throw new AppError(`Config key '${req.params.key}' not found`, 404);
    res.status(200).json({ success: true, message: 'Config deleted successfully' });
  } catch (err) {
    next(err);
  }
};
