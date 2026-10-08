'use strict';

const Deal     = require('../models/Deal.model');
const User     = require('../models/User.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

/**
 * Returns a paginated, filtered, sorted list of deals.
 *
 * Filters supported:
 *   stage, assignedTo            — exact match
 *   minValue, maxValue           — deal value range
 *   closingDateFrom, closingDateTo — expectedCloseDate range
 *   search                       — keyword on title
 *
 * Role scoping:
 *   Admin         → all deals
 *   Sales Manager → team deals (assignedTo in their team) + unassigned
 *   Sales Exec    → only their own deals
 *
 * @param {object} filters
 * @param {object} user
 * @param {number} page
 * @param {number} limit
 * @param {string} sort
 * @returns {{ deals, pagination }}
 */
exports.getAllDeals = async (filters = {}, user, page = 1, limit = 10, sort = '-createdAt') => {
  const query = {};

  // ── Exact-match filters ────────────────────────────────────────────────────
  if (filters.stage)      query.stage      = filters.stage;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.customer)   query.customer   = filters.customer;
  if (filters.lead)       query.lead       = filters.lead;

  // ── Value range filter ─────────────────────────────────────────────────────
  if (filters.minValue !== undefined || filters.maxValue !== undefined) {
    query.value = {};
    if (filters.minValue !== undefined) query.value.$gte = Number(filters.minValue);
    if (filters.maxValue !== undefined) query.value.$lte = Number(filters.maxValue);
  }

  // ── Expected close date range ──────────────────────────────────────────────
  if (filters.closingDateFrom || filters.closingDateTo) {
    query.expectedCloseDate = {};
    if (filters.closingDateFrom) query.expectedCloseDate.$gte = new Date(filters.closingDateFrom);
    if (filters.closingDateTo)   query.expectedCloseDate.$lte = new Date(filters.closingDateTo);
  }

  // ── Keyword search on deal title ───────────────────────────────────────────
  if (filters.search && filters.search.trim()) {
    query.title = new RegExp(filters.search.trim(), 'i');
  }

  // ── Role-based scoping ─────────────────────────────────────────────────────
  if (user.role === 'sales_executive') {
    query.assignedTo = user._id;
  } else if (user.role === 'sales_manager') {
    if (!filters.assignedTo) {
      const teamMembers = await User.find({ manager: user._id, isActive: true }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      query.$or = [
        { assignedTo: { $in: [...teamIds, user._id] } },
        { assignedTo: null },
      ];
    }
  }

  const parsedPage  = Math.max(1, parseInt(page,  10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const { skip }    = paginate(null, parsedPage, parsedLimit);
  const sortObj     = buildSortObject(sort || '-createdAt');

  const [deals, totalRecords] = await Promise.all([
    Deal.find(query)
      .populate('lead',       'name email status')
      .populate('customer',   'name email company')
      .populate('assignedTo', 'name email role')
      .populate('createdBy',  'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit),
    Deal.countDocuments(query),
  ]);

  return {
    deals,
    pagination: {
      currentPage:  parsedPage,
      pageSize:     parsedLimit,
      totalRecords,
      totalPages:   Math.ceil(totalRecords / parsedLimit),
    },
  };
};

/**
 * Returns a single deal by ID with fully populated references.
 * Sales executives can only view deals assigned to them.
 *
 * @param {string} id
 * @param {object} user
 * @returns {object} Deal document
 */
exports.getDeal = async (id, user) => {
  const deal = await Deal.findById(id)
    .populate('lead',     'name email status source priority convertedAt')
    .populate('customer', 'name email company phone address')
    .populate('assignedTo', 'name email role')
    .populate('createdBy',  'name');

  if (!deal) throw new AppError('Deal not found', 404);

  // Ownership check for sales executives
  if (
    user.role === 'sales_executive' &&
    String(deal.assignedTo?._id || deal.assignedTo) !== String(user._id)
  ) {
    throw new AppError('Access denied', 403);
  }

  return deal;
};

/**
 * Creates a new deal and records a timeline entry.
 * expectedRevenue is calculated from value * probability/100.
 *
 * @param {object} data
 * @returns {object} Deal document
 */
exports.createDeal = async (data) => {
  // Explicitly compute expectedRevenue on create
  if (data.value !== undefined && data.probability !== undefined) {
    data.expectedRevenue = Math.round(data.value * (data.probability / 100) * 100) / 100;
  }

  const deal = await Deal.create(data);

  await TimelineService.createTimelineEntry({
    action:      'Deal created',
    entityType:  'deal',
    entityId:    deal._id,
    performedBy: data.createdBy,
    newValue:    { stage: deal.stage, value: deal.value, expectedRevenue: deal.expectedRevenue },
  });

  return deal;
};

/**
 * Updates deal fields (non-stage) and records a timeline entry.
 * Uses save() so the pre-save hook recalculates expectedRevenue.
 * Sales executives can only update deals assigned to them.
 * Stage changes are blocked — use updateDealStage instead.
 *
 * @param {string} id
 * @param {object} data
 * @param {object} user
 * @returns {object} Updated deal document
 */
exports.updateDeal = async (id, data, user) => {
  const deal = await Deal.findById(id);
  if (!deal) throw new AppError('Deal not found', 404);

  // Ownership check for executives
  if (
    user.role === 'sales_executive' &&
    String(deal.assignedTo) !== String(user._id)
  ) {
    throw new AppError('You can only update deals assigned to you', 403);
  }

  // Block stage changes via this endpoint
  if (data.stage) {
    throw new AppError('Use PATCH /deals/:id/stage to change deal stage', 400);
  }

  const previousValue = {
    title:           deal.title,
    value:           deal.value,
    probability:     deal.probability,
    expectedRevenue: deal.expectedRevenue,
  };

  // Apply updates — pre-save hook recalculates expectedRevenue
  Object.assign(deal, data);
  await deal.save();

  await TimelineService.createTimelineEntry({
    action:      'Deal updated',
    entityType:  'deal',
    entityId:    id,
    performedBy: user._id,
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
 * Deletes a deal by ID (admin/manager only — enforced at route level).
 * @param {string} id
 * @returns {object} Deleted deal document
 */
exports.deleteDeal = async (id) => {
  const deal = await Deal.findByIdAndDelete(id);
  if (!deal) throw new AppError('Deal not found', 404);
  return deal;
};

/**
 * Transitions a deal to a new pipeline stage with full business rule validation.
 *
 * Rules:
 *  - Won:  value > 0, probability === 100, expectedCloseDate required
 *  - Lost: lostReason required
 *  - Terminal deals (won/lost) can only be re-opened by admin
 *  - Sales executives can only update deals assigned to them
 *
 * @param {string} id
 * @param {object} stageData  - { stage, lostReason?, value?, probability?, expectedCloseDate? }
 * @param {object} user       - Full user object { _id, role }
 * @returns {object} Updated deal document
 */
exports.updateDealStage = async (id, stageData, user) => {
  const { stage, lostReason, value, probability, expectedCloseDate } = stageData;

  const deal = await Deal.findById(id);
  if (!deal) throw new AppError('Deal not found', 404);

  // Ownership check for executives
  if (
    user.role === 'sales_executive' &&
    String(deal.assignedTo) !== String(user._id)
  ) {
    throw new AppError('You can only update deals assigned to you', 403);
  }

  const currentStage    = deal.stage;
  const terminalStages  = ['won', 'lost'];

  // Only admins can re-open a terminal deal
  if (terminalStages.includes(currentStage) && user.role !== 'admin') {
    throw new AppError(
      `Cannot change the stage of a ${currentStage} deal. Only an admin can re-open it.`,
      403
    );
  }

  // ── Won stage requirements ────────────────────────────────────────────────
  if (stage === 'won') {
    const effectiveValue = value !== undefined ? value : deal.value;
    if (!effectiveValue || effectiveValue <= 0) {
      throw new AppError('Deal value must be greater than 0 to mark as won', 400);
    }
    const effectiveProbability = probability !== undefined ? probability : deal.probability;
    if (effectiveProbability !== 100) {
      throw new AppError('Probability must be 100 to mark a deal as won', 400);
    }
    const effectiveCloseDate = expectedCloseDate || deal.expectedCloseDate;
    if (!effectiveCloseDate) {
      throw new AppError('Expected close date is required to mark a deal as won', 400);
    }
    // Close date business validation — must not be unreasonably far in the past
    const closeDate = new Date(effectiveCloseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Allow backdating by up to 30 days (real-world deals close before they're recorded)
    const minAllowed = new Date(today);
    minAllowed.setDate(minAllowed.getDate() - 30);
    if (closeDate < minAllowed) {
      throw new AppError('Expected close date cannot be more than 30 days in the past', 400);
    }
  }

  // ── Lost stage requirements ───────────────────────────────────────────────
  if (stage === 'lost' && !lostReason) {
    throw new AppError('A reason is required when marking a deal as lost', 400);
  }

  // Apply changes — pre-save hook updates expectedRevenue and timestamps
  if (lostReason !== undefined)         deal.lostReason         = lostReason;
  if (value !== undefined)              deal.value              = value;
  if (probability !== undefined)        deal.probability        = probability;
  if (expectedCloseDate !== undefined)  deal.expectedCloseDate  = expectedCloseDate;
  deal.stage = stage;

  const updated = await deal.save();

  await TimelineService.createTimelineEntry({
    action:      `Deal stage changed: ${currentStage} → ${stage}`,
    entityType:  'deal',
    entityId:    id,
    performedBy: user._id,
    previousValue: { stage: currentStage },
    newValue: {
      stage,
      value:           updated.value,
      probability:     updated.probability,
      expectedRevenue: updated.expectedRevenue,
    },
  });

  return updated;
};
