'use strict';

const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true,
    },
    // Lead → Customer → Deal relationship refs
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
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
    // Stored field — kept in sync by pre-save hook so it's queryable/sortable
    expectedRevenue: {
      type: Number,
      default: 0,
      min: [0, 'Expected revenue cannot be negative'],
    },
    expectedCloseDate: {
      type: Date,
      index: true,
    },
    stage: {
      type: String,
      enum: ['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'],
      default: 'qualification',
      index: true,
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
    toJSON:   { virtuals: false }, // no virtuals — using stored field instead
    toObject: { virtuals: false },
  }
);

/**
 * Pre-save hook:
 *  1. Keep expectedRevenue in sync with value * probability/100
 *  2. Stamp wonAt / lostAt when stage transitions to terminal states
 */
dealSchema.pre('save', function (next) {
  // Always recalculate expectedRevenue from stored value + probability
  if (this.isModified('value') || this.isModified('probability')) {
    this.expectedRevenue = Math.round(this.value * (this.probability / 100) * 100) / 100;
  }

  // Stamp terminal timestamps on stage change
  if (this.isModified('stage')) {
    if (this.stage === 'won') {
      this.wonAt  = this.wonAt  || new Date();
      this.lostAt = undefined;
    } else if (this.stage === 'lost') {
      this.lostAt = this.lostAt || new Date();
      this.wonAt  = undefined;
    }
  }

  next();
});

/**
 * Pre-findOneAndUpdate hook: keep expectedRevenue in sync when updated via
 * findByIdAndUpdate (which bypasses pre-save).
 */
dealSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  const val  = update.value  ?? update.$set?.value;
  const prob = update.probability ?? update.$set?.probability;

  if (val !== undefined || prob !== undefined) {
    // We need both current values — fetch them or use update values
    const newVal  = val  !== undefined ? val  : null;
    const newProb = prob !== undefined ? prob : null;

    if (newVal !== null && newProb !== null) {
      const rev = Math.round(newVal * (newProb / 100) * 100) / 100;
      if (!update.$set) update.$set = {};
      update.$set.expectedRevenue = rev;
    }
  }

  next();
});

// Compound indexes for most common query patterns
dealSchema.index({ stage: 1, assignedTo: 1 });
dealSchema.index({ customer: 1, stage: 1 });
dealSchema.index({ createdAt: -1 });
dealSchema.index({ expectedCloseDate: 1, stage: 1 });

const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;
