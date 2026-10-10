'use strict';

const Config   = require('../models/Config.model');
const AppError = require('../utils/AppError');

exports.getAllConfig = async () => {
  return Config.find().sort({ key: 1 }).lean();
};

exports.getConfig = async (key) => {
  const config = await Config.findOne({ key }).lean();
  if (!config) throw new AppError(`Config key '${key}' not found`, 404);
  return config;
};

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

exports.deleteConfig = async (key) => {
  const config = await Config.findOneAndDelete({ key });
  if (!config) throw new AppError(`Config key '${key}' not found`, 404);
  return config;
};
