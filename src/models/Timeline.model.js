'use strict';

const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
    },
    entityType: {
      type: String,
      required: [true, 'entityType is required'],
      enum: ['lead', 'customer', 'deal', 'user'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'entityId is required'],
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient timeline lookups
// Primary: fetch all entries for a specific entity, sorted by time
timelineSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
// Alternate: lookup by entity alone (for cross-type queries)
timelineSchema.index({ entityId: 1, createdAt: -1 });
// Who performed actions (for user audit trail)
timelineSchema.index({ performedBy: 1, createdAt: -1 });

const Timeline = mongoose.model('Timeline', timelineSchema);

module.exports = Timeline;
