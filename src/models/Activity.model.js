'use strict';

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: ['call', 'email', 'meeting', 'demo', 'follow_up', 'reminder', 'note'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
    },
    description: {
      type: String,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue'],
      default: 'pending',
      index: true,
    },
    relatedTo: {
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
      },
      entityType: {
        type: String,
        enum: ['lead', 'customer', 'deal', 'user'],
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy is required'],
      index: true,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

activitySchema.index({ status: 1, dueDate: 1 });
activitySchema.index({ assignedTo: 1, status: 1 });
activitySchema.index({ 'relatedTo.entityId': 1, 'relatedTo.entityType': 1 });
activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
