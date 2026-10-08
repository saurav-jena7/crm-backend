'use strict';

const Deal = require('../models/Deal.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

/**
 * Returns a paginated list of deals.
 * Sales executives only see their own deals.
 *
 * @param {object} filters
 * @param {object} user  - { _id, role }
 * @param {number} page
 * @param {number} limit
 * @param {string} sort
 * @returns {{ deals, total, page, totalPages }}
 */
exports.getAllDeals = async (filters = {}, user, page = 1, limit = 10, sort = '-createdAt') => {
  const query = { ...filters };

  if (user.role === 'sales_executive') {
    query.assignedTo = user._id;
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
 * @param {object} data
 * @returns {object} Deal document
 */
exports.createDeal = async (data) => {
  const deal = await Deal.create(data);

  await TimelineService.createTimelineEntry({
    action: 'Deal created',
    entityType: 'deal',
    entityId: deal._id,
    performedBy: data.createdBy,
  });

  return deal;
};

/**
 * Updates a deal and records a timeline entry.
 * @param {string} id
 * @param {object} data
 * @param {string} performedBy
 * @returns {object} Updated deal document
 */
exports.updateDeal = async (id, data, performedBy) => {
  const existing = await Deal.findById(id);
  if (!existing) throw new AppError('Deal not found', 404);

  const previousValue = {
    title: existing.title,
    stage: existing.stage,
    value: existing.value,
  };

  const deal = await Deal.findByIdAndUpdate(id, data, { new: true, runValidators: true });

  await TimelineService.createTimelineEntry({
    action: 'Deal updated',
    entityType: 'deal',
    entityId: id,
    performedBy,
    previousValue,
    newValue: data,
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

  const updateData = {
    stage,
    ...(lostReason && { lostReason }),
    ...(value !== undefined && { value }),
    ...(probability !== undefined && { probability }),
    ...(expectedCloseDate && { expectedCloseDate }),
    // Stamp terminal timestamps
    ...(stage === 'won' && { wonAt: new Date() }),
    ...(stage === 'lost' && { lostAt: new Date() }),
  };

  const updated = await Deal.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  await TimelineService.createTimelineEntry({
    action: `Stage changed: ${currentStage} → ${stage}`,
    entityType: 'deal',
    entityId: id,
    performedBy,
    previousValue: { stage: currentStage },
    newValue: { stage },
  });

  return updated;
};
