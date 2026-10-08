'use strict';

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: ['call', 'email', 'meeting', 'demo', 'follow_up', 'reminder', 'note'],
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
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue'],
      default: 'pending',
    },
    relatedTo: {
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'entityId is required'],
      },
      entityType: {
        type: String,
        required: [true, 'entityType is required'],
        enum: ['lead', 'customer', 'deal'],
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy is required'],
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index for querying pending/overdue activities by due date
activitySchema.index({ status: 1, dueDate: 1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
