'use strict';

const Deal = require('../models/Deal.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

/**
 * Returns a paginated list of deals.
 * - Admin: all deals
 * - Sales Manager: deals assigned to their team or themselves
 * - Sales Executive: only their own deals
 */
exports.getAllDeals = async (filters = {}, user, page = 1, limit = 10, sort = '-createdAt') => {
  const query = { ...filters };

  if (user.role === 'sales_executive') {
    query.assignedTo = user._id;
  } else if (user.role === 'sales_manager') {
    const teamMembers = await User.find({ manager: user._id, isActive: true }).select('_id');
    const teamIds = teamMembers.map((m) => m._id);
    query.$or = [{ assignedTo: { $in: [...teamIds, user._id] } }, { assignedTo: null }];
  }

  const { skip, limit: parsedLimit } = paginate(null, page, limit);
  const sortObj = buildSortObject(sort);

  const [deals, total] = await Promise.all([
    Deal.find(query)
      .populate('lead', 'name email')
      .populate('customer', 'name email')
      .populate('assignedTo', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit),
    Deal.countDocuments(query),
  ]);

  return {
    deals,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
};

/**
 * Returns a single deal by ID with populated references.
 * @param {string} id
 * @returns {object} Deal document
 */
exports.getDeal = async (id) => {
  const deal = await Deal.findById(id)
    .populate('lead', 'name email')
    .populate('customer', 'name email company')
    .populate('assignedTo', 'name email');

  if (!deal) throw new AppError('Deal not found', 404);
  return deal;
};

/**
 * Creates a new deal and records a timeline entry.
 * expectedRevenue is calculated by the pre-save hook (value * probability/100).
 *
 * @param {object} data
 * @returns {object} Deal document
 */
exports.createDeal = async (data) => {
  // Calculate expectedRevenue explicitly on create so it's stored immediately
  if (data.value !== undefined && data.probability !== undefined) {
    data.expectedRevenue = Math.round(data.value * (data.probability / 100) * 100) / 100;
  }

  const deal = await Deal.create(data);

  await TimelineService.createTimelineEntry({
    action: 'Deal created',
    entityType: 'deal',
    entityId: deal._id,
    performedBy: data.createdBy,
    newValue: { stage: deal.stage, value: deal.value },
  });

  return deal;
};

/**
 * Updates a deal's non-stage fields and records a timeline entry.
 * Uses save() so the pre-save hook recalculates expectedRevenue.
 *
 * @param {string} id
 * @param {object} data
 * @param {string} performedBy
 * @returns {object} Updated deal document
 */
exports.updateDeal = async (id, data, performedBy) => {
  const deal = await Deal.findById(id);
  if (!deal) throw new AppError('Deal not found', 404);

  // Block stage changes through update — must use the dedicated stage endpoint
  if (data.stage) {
    throw new AppError('Use PATCH /deals/:id/stage to change deal stage', 400);
  }

  const previousValue = {
    title:           deal.title,
    value:           deal.value,
    probability:     deal.probability,
    expectedRevenue: deal.expectedRevenue,
  };

  // Apply updates to the document so pre-save hook recalculates expectedRevenue
  Object.assign(deal, data);
  await deal.save();

  await TimelineService.createTimelineEntry({
    action: 'Deal updated',
    entityType: 'deal',
    entityId: id,
    performedBy,
    previousValue,
    newValue: {
      title:           deal.title,
      value:           deal.value,
      probability:     deal.probability,
      expectedRevenue: deal.expectedRevenue,
    },
  });

  return deal;
};

/**
 * Deletes a deal by ID.
 * @param {string} id
 * @returns {object} Deleted deal document
 */
exports.deleteDeal = async (id) => {
  const deal = await Deal.findByIdAndDelete(id);
  if (!deal) throw new AppError('Deal not found', 404);
  return deal;
};

/**
 * Transitions a deal to a new pipeline stage with validation rules.
 *
 * Rules:
 * - Won: value > 0, probability === 100, expectedCloseDate required
 * - Lost: lostReason required
 * - If current stage is 'won' or 'lost', only admin can override
 *
 * @param {string} id
 * @param {object} stageData  - { stage, lostReason?, value?, probability?, expectedCloseDate? }
 * @param {string} performedBy
 * @param {string} userRole
 * @returns {object} Updated deal document
 */
exports.updateDealStage = async (
  id,
  { stage, lostReason, value, probability, expectedCloseDate },
  performedBy,
  userRole
) => {
  const deal = await Deal.findById(id);
  if (!deal) throw new AppError('Deal not found', 404);

  const currentStage = deal.stage;
  const terminalStages = ['won', 'lost'];

  // Only admins can re-open a terminal deal
  if (terminalStages.includes(currentStage) && userRole !== 'admin') {
    throw new AppError('Cannot change the stage of a won or lost deal', 403);
  }

  // Won stage requirements
  if (stage === 'won') {
    const effectiveValue = value !== undefined ? value : deal.value;
    if (!effectiveValue || effectiveValue <= 0) {
      throw new AppError('Deal value is required and must be greater than 0 for a won deal', 400);
    }

    const effectiveProbability = probability !== undefined ? probability : deal.probability;
    if (effectiveProbability !== 100) {
      throw new AppError('Probability must be 100 for a won deal', 400);
    }

    const effectiveCloseDate = expectedCloseDate || deal.expectedCloseDate;
    if (!effectiveCloseDate) {
      throw new AppError('Expected close date is required for a won deal', 400);
    }
  }

  // Lost stage requirements
  if (stage === 'lost' && !lostReason) {
    throw new AppError('Lost reason is required when marking a deal as lost', 400);
  }

  // Apply stage transition updates via save() so the pre-save hook fires
  if (lostReason)         deal.lostReason         = lostReason;
  if (value !== undefined)     deal.value          = value;
  if (probability !== undefined) deal.probability  = probability;
  if (expectedCloseDate)  deal.expectedCloseDate   = expectedCloseDate;
  deal.stage = stage;
  // expectedRevenue is recalculated automatically by the pre-save hook

  const updated = await deal.save();

  await TimelineService.createTimelineEntry({
    action: `Deal stage changed: ${currentStage} → ${stage}`,
    entityType: 'deal',
    entityId: id,
    performedBy,
    previousValue: { stage: currentStage },
    newValue: { stage, value: updated.value, probability: updated.probability, expectedRevenue: updated.expectedRevenue },
  });

  return updated;
};
