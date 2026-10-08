'use strict';

const mongoose = require('mongoose');

/**
 * CRM Configuration — singleton-style document.
 * Admin can read/update these settings via /api/config.
 */
const configSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const Config = mongoose.model('Config', configSchema);

module.exports = Config;
