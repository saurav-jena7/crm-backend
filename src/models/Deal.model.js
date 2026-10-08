'use strict';

const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    value: {
      type: Number,
      default: 0,
      min: [0, 'Value cannot be negative'],
    },
    probability: {
      type: Number,
      default: 0,
      min: [0, 'Probability cannot be negative'],
      max: [100, 'Probability cannot exceed 100'],
    },
    expectedCloseDate: {
      type: Date,
    },
    stage: {
      type: String,
      enum: ['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'],
      default: 'qualification',
    },
    description: {
      type: String,
    },
    lostReason: {
      type: String,
    },
    wonAt: {
      type: Date,
    },
    lostAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: expected revenue = deal value weighted by probability
dealSchema.virtual('expectedRevenue').get(function () {
  return this.value * (this.probability / 100);
});

// Pre-save: stamp wonAt / lostAt when stage changes to terminal states
dealSchema.pre('save', function (next) {
  if (this.isModified('stage')) {
    if (this.stage === 'won') {
      this.wonAt = Date.now();
    } else if (this.stage === 'lost') {
      this.lostAt = Date.now();
    }
  }
  next();
});

// Index to support pipeline views filtered by stage and assignee
dealSchema.index({ stage: 1, assignedTo: 1 });

const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;
