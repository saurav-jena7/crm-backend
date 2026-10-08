'use strict';

const Lead     = require('../models/Lead.model');
const Deal     = require('../models/Deal.model');
const Customer = require('../models/Customer.model');
const Activity = require('../models/Activity.model');
const User     = require('../models/User.model');

/**
 * Marks pending activities as overdue — called before any stats query
 * so counts are always accurate.
 */
const refreshOverdue = () =>
  Activity.updateMany(
    { dueDate: { $lt: new Date() }, status: 'pending' },
    { $set: { status: 'overdue' } }
  );

/**
 * GET /api/dashboard/stats
 *
 * Returns every metric listed in spec section 13:
 *   Leads:      total, new, qualified, converted, conversionRate
 *   Customers:  total
 *   Deals:      total, open, won, lost, winRate
 *   Revenue:    totalRevenue (won deals), expectedRevenue (open deals, stored field)
 *   Activities: pending, overdue
 */
exports.getStats = async () => {
  await refreshOverdue();

  const [
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,
    convertedLeads,
    unqualifiedLeads,
    lostLeads,
    totalCustomers,
    activeCustomers,
    totalDeals,
    openDeals,
    wonDeals,
    lostDeals,
    pendingActivities,
    overdueActivities,
    revenueAgg,
    expectedRevenueAgg,
  ] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ status: 'new' }),
    Lead.countDocuments({ status: 'contacted' }),
    Lead.countDocuments({ status: 'qualified' }),
    Lead.countDocuments({ status: 'converted' }),
    Lead.countDocuments({ status: 'unqualified' }),
    Lead.countDocuments({ status: 'lost' }),
    Customer.countDocuments(),
    Customer.countDocuments({ status: 'active' }),
    Deal.countDocuments(),
    Deal.countDocuments({ stage: { $nin: ['won', 'lost'] } }),
    Deal.countDocuments({ stage: 'won' }),
    Deal.countDocuments({ stage: 'lost' }),
    Activity.countDocuments({ status: 'pending' }),
    Activity.countDocuments({ status: 'overdue' }),
    // Total revenue = sum of all won deal values
    Deal.aggregate([
      { $match: { stage: 'won' } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]),
    // Expected revenue = sum of stored expectedRevenue field on open deals
    Deal.aggregate([
      { $match: { stage: { $nin: ['won', 'lost'] } } },
      { $group: { _id: null, total: { $sum: '$expectedRevenue' } } },
    ]),
  ]);

  const totalRevenue    = revenueAgg[0]?.total    || 0;
  const expectedRevenue = expectedRevenueAgg[0]?.total || 0;
  const closedDeals     = wonDeals + lostDeals;
  const winRate         = closedDeals > 0
    ? Math.round((wonDeals / closedDeals) * 10000) / 100
    : 0;
  const conversionRate  = totalLeads > 0
    ? Math.round((convertedLeads / totalLeads) * 10000) / 100
    : 0;

  return {
    // ── Leads ──────────────────────────────────────────────────────────────
    leads: {
      total:       totalLeads,
      new:         newLeads,
      contacted:   contactedLeads,
      qualified:   qualifiedLeads,
      converted:   convertedLeads,
      unqualified: unqualifiedLeads,
      lost:        lostLeads,
    },
    // ── Customers ──────────────────────────────────────────────────────────
    customers: {
      total:  totalCustomers,
      active: activeCustomers,
    },
    // ── Deals ──────────────────────────────────────────────────────────────
    deals: {
      total: totalDeals,
      open:  openDeals,
      won:   wonDeals,
      lost:  lostDeals,
    },
    // ── Revenue ────────────────────────────────────────────────────────────
    revenue: {
      total:    Math.round(totalRevenue    * 100) / 100,
      expected: Math.round(expectedRevenue * 100) / 100,
    },
    // ── Activities ─────────────────────────────────────────────────────────
    activities: {
      pending:  pendingActivities,
      overdue:  overdueActivities,
    },
    // ── Rates ──────────────────────────────────────────────────────────────
    rates: {
      conversionRate, // converted leads / total leads × 100
      winRate,        // won deals / closed deals × 100
    },
  };
};

/**
 * GET /api/dashboard/pipeline
 *
 * Returns deal count, total value, and expected revenue per stage.
 * All 6 stages always returned (zero-filled if no deals).
 *
 *   Qualification → { count, totalValue, expectedRevenue }
 *   Discovery     → { count, totalValue, expectedRevenue }
 *   Proposal      → { count, totalValue, expectedRevenue }
 *   Negotiation   → { count, totalValue, expectedRevenue }
 *   Won           → { count, totalValue, expectedRevenue }
 *   Lost          → { count, totalValue, expectedRevenue }
 */
exports.getPipeline = async () => {
  const stageOrder = ['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];

  const results = await Deal.aggregate([
    {
      $group: {
        _id:             '$stage',
        count:           { $sum: 1 },
        totalValue:      { $sum: '$value' },
        expectedRevenue: { $sum: '$expectedRevenue' }, // uses stored field
        avgProbability:  { $avg: '$probability' },
      },
    },
  ]);

  return stageOrder.map((stage) => {
    const found = results.find((r) => r._id === stage);
    return {
      stage,
      count:           found?.count           || 0,
      totalValue:      Math.round((found?.totalValue      || 0) * 100) / 100,
      expectedRevenue: Math.round((found?.expectedRevenue || 0) * 100) / 100,
      avgProbability:  Math.round((found?.avgProbability  || 0) * 100) / 100,
    };
  });
};

/**
 * GET /api/dashboard/team-performance
 *
 * Returns per-user stats:
 *   leadsAssigned, leadsConverted, conversionRate
 *   dealsTotal, dealsWon, openDeals, totalWonValue
 *   pendingActivities, overdueActivities
 *
 * Admin → all active users
 * Manager → only their team (users where user.manager = managerId)
 *
 * @param {string|Date} [startDate]
 * @param {string|Date} [endDate]
 * @param {ObjectId}    [managerFilter] - manager's _id to scope results
 */
exports.getTeamPerformance = async (startDate, endDate, managerFilter = null) => {
  await refreshOverdue();

  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate)   dateFilter.createdAt.$lte = new Date(endDate);
  }

  const userMatch = { isActive: true };
  if (managerFilter) userMatch.manager = managerFilter;

  return User.aggregate([
    { $match: userMatch },

    // ── Leads assigned ──────────────────────────────────────────────────────
    {
      $lookup: {
        from: 'leads',
        let:  { userId: '$_id' },
        pipeline: [{
          $match: { $expr: { $eq: ['$assignedTo', '$$userId'] }, ...dateFilter },
        }],
        as: 'assignedLeads',
      },
    },
    // ── Converted leads ─────────────────────────────────────────────────────
    {
      $lookup: {
        from: 'leads',
        let:  { userId: '$_id' },
        pipeline: [{
          $match: {
            $expr: { $eq: ['$assignedTo', '$$userId'] },
            status: 'converted',
            ...dateFilter,
          },
        }],
        as: 'convertedLeads',
      },
    },
    // ── All deals ───────────────────────────────────────────────────────────
    {
      $lookup: {
        from: 'deals',
        let:  { userId: '$_id' },
        pipeline: [{
          $match: { $expr: { $eq: ['$assignedTo', '$$userId'] }, ...dateFilter },
        }],
        as: 'allDeals',
      },
    },
    // ── Won deals ───────────────────────────────────────────────────────────
    {
      $lookup: {
        from: 'deals',
        let:  { userId: '$_id' },
        pipeline: [{
          $match: {
            $expr: { $eq: ['$assignedTo', '$$userId'] },
            stage: 'won',
            ...dateFilter,
          },
        }],
        as: 'wonDeals',
      },
    },
    // ── Pending activities ──────────────────────────────────────────────────
    {
      $lookup: {
        from: 'activities',
        let:  { userId: '$_id' },
        pipeline: [{
          $match: {
            $expr: { $eq: ['$assignedTo', '$$userId'] },
            status: 'pending',
          },
        }],
        as: 'pendingActivities',
      },
    },
    // ── Overdue activities ──────────────────────────────────────────────────
    {
      $lookup: {
        from: 'activities',
        let:  { userId: '$_id' },
        pipeline: [{
          $match: {
            $expr: { $eq: ['$assignedTo', '$$userId'] },
            status: 'overdue',
          },
        }],
        as: 'overdueActivities',
      },
    },

    {
      $project: {
        name:  1,
        email: 1,
        role:  1,
        // Leads
        leadsAssigned:  { $size: '$assignedLeads' },
        leadsConverted: { $size: '$convertedLeads' },
        conversionRate: {
          $cond: [
            { $gt: [{ $size: '$assignedLeads' }, 0] },
            {
              $round: [{
                $multiply: [
                  { $divide: [{ $size: '$convertedLeads' }, { $size: '$assignedLeads' }] },
                  100,
                ],
              }, 2],
            },
            0,
          ],
        },
        // Deals
        dealsTotal:    { $size: '$allDeals' },
        dealsWon:      { $size: '$wonDeals' },
        openDeals: {
          $size: {
            $filter: {
              input: '$allDeals',
              as:    'd',
              cond:  { $not: [{ $in: ['$$d.stage', ['won', 'lost']] }] },
            },
          },
        },
        totalWonValue: { $sum: '$wonDeals.value' },
        // Activities
        pendingActivities:  { $size: '$pendingActivities' },
        overdueActivities:  { $size: '$overdueActivities' },
      },
    },
    { $sort: { totalWonValue: -1 } },
  ]);
};

/**
 * GET /api/dashboard/recent-activities
 *
 * @param {number} [limit=10]
 */
exports.getRecentActivities = async (limit = 10) => {
  await refreshOverdue();

  return Activity.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('assignedTo', 'name email role')
    .populate('createdBy',  'name');
};

/**
 * GET /api/dashboard/team-activities
 *
 * Returns pending and overdue activities for a manager's team.
 *
 * @param {ObjectId} managerId
 * @param {object}   [filters] - { status?, type? }
 */
exports.getTeamActivities = async (managerId, filters = {}) => {
  await refreshOverdue();

  const teamMembers = await User.find({ manager: managerId, isActive: true }).select('_id');
  const teamIds     = [...teamMembers.map((m) => m._id), managerId];

  const query = { assignedTo: { $in: teamIds } };
  if (filters.status) query.status = filters.status;
  if (filters.type)   query.type   = filters.type;

  return Activity.find(query)
    .sort({ dueDate: 1 })
    .populate('assignedTo', 'name email role')
    .populate('createdBy',  'name');
};
