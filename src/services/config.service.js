'use strict';

const Config   = require('../models/Config.model');
const AppError = require('../utils/AppError');

/**
 * Returns all CRM configuration settings sorted by key.
 * @returns {Array} Config documents
 */
exports.getAllConfig = async () => {
  return Config.find().sort({ key: 1 }).lean();
};

/**
 * Returns a single config entry by key.
 * @param {string} key
 * @returns {object} Config document
 */
exports.getConfig = async (key) => {
  const config = await Config.findOne({ key }).lean();
  if (!config) throw new AppError(`Config key '${key}' not found`, 404);
  return config;
};

/**
 * Creates or updates a config entry (upsert by key).
 * @param {string} key
 * @param {*}      value
 * @param {string} [description]
 * @param {string} updatedBy - User ID of the admin making the change
 * @returns {object} Config document
 */
exports.setConfig = async (key, value, description, updatedBy) => {
  if (!key || value === undefined) {
    throw new AppError('key and value are required', 400);
  }
  return Config.findOneAndUpdate(
    { key },
    { value, description, updatedBy },
    { new: true, upsert: true, runValidators: true }
  );
};

/**
 * Deletes a config entry by key.
 * @param {string} key
 * @returns {object} Deleted config document
 */
exports.deleteConfig = async (key) => {
  const config = await Config.findOneAndDelete({ key });
  if (!config) throw new AppError(`Config key '${key}' not found`, 404);
  return config;
};
