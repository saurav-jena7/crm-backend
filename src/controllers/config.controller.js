'use strict';

const configService = require('../services/config.service');

exports.getAllConfig = async (req, res, next) => {
  try {
    const configs = await configService.getAllConfig();
    res.status(200).json({ success: true, message: 'Config fetched successfully', data: { configs } });
  } catch (err) {
    next(err);
  }
};

exports.getConfig = async (req, res, next) => {
  try {
    const config = await configService.getConfig(req.params.key);
    res.status(200).json({ success: true, message: 'Config fetched successfully', data: { config } });
  } catch (err) {
    next(err);
  }
};

exports.setConfig = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;
    const config = await configService.setConfig(key, value, description, req.user._id);
    res.status(200).json({ success: true, message: 'Config saved successfully', data: { config } });
  } catch (err) {
    next(err);
  }
};

exports.deleteConfig = async (req, res, next) => {
  try {
    await configService.deleteConfig(req.params.key);
    res.status(200).json({ success: true, message: 'Config deleted successfully' });
  } catch (err) {
    next(err);
  }
};
