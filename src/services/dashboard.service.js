'use strict';

const Lead = require('../models/Lead.model');
const Deal = require('../models/Deal.model');
const Customer = require('../models/Customer.model');
const Activity = require('../models/Activity.model');
const User = require('../models/User.model');

/**
 * Returns high-level CRM statistics.
 * Covers all metrics required by the spec:
 * - total/new/qualified/converted leads
 * - total customers
 * - total/open/won/lost deals
 * - total revenue, expected revenue
 * - conversion rate, win rate
 * - pending/overdue activities
 */
exports.getStats = async () => {
  // Mark overdue activities before counting
  await Activity.updateMany(
    { dueDate: { $lt: new Date() }, status: 'pending' },
    { $set: { status: 'overdue' } }
  );

  const [
    totalLeads,
    newLeads,
    qualifiedLeads,
    convertedLeads,
    totalCustomers,
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
    Lead.countDocuments({ status: 'qualified' }),
    Lead.countDocuments({ status: 'converted' }),
    Customer.countDocuments(),
    Deal.countDocuments(),
    Deal.countDocuments({ stage: { $nin: ['won', 'lost'] } }),
    Deal.countDocuments({ stage: 'won' }),
    Deal.countDocuments({ stage: 'lost' }),
    Activity.countDocuments({ status: 'pending' }),
    Activity.countDocuments({ status: 'overdue' }),
    // Total revenue = sum of won deal values
    Deal.aggregate([
      { $match: { stage: 'won' } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]),
    // Expected revenue = sum of (value * probability/100) for open deals
    Deal.aggregate([
      { $match: { stage: { $nin: ['won', 'lost'] } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } },
        },
      },
    ]),
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;
  const expectedRevenue = expectedRevenueAgg[0]?.total || 0;
  const closedDeals = wonDeals + lostDeals;
  const winRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 10000) / 100 : 0;
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 10000) / 100 : 0;

  return {
    leads: {
      total: totalLeads,
      new: newLeads,
      qualified: qualifiedLeads,
      converted: convertedLeads,
      conversionRate,
    },
    customers: {
      total: totalCustomers,
    },
    deals: {
      total: totalDeals,
      open: openDeals,
      won: wonDeals,
      lost: lostDeals,
      winRate,
    },
    revenue: {
      total: totalRevenue,
      expected: Math.round(expectedRevenue * 100) / 100,
    },
    activities: {
      pending: pendingActivities,
      overdue: overdueActivities,
    },
  };
};

/**
 * Returns the deal pipeline grouped by stage (all stages, including won/lost).
 * Each stage shows count and total value.
 *
 * @returns {Array} [{ stage, count, totalValue }]
 */
exports.getPipeline = async () => {
  const stageOrder = ['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];

  const results = await Deal.aggregate([
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgProbability: { $avg: '$probability' },
      },
    },
  ]);

  // Return in defined stage order, filling in zero-count stages
  return stageOrder.map((stage) => {
    const found = results.find((r) => r._id === stage);
    return {
      stage,
      count: found?.count || 0,
      totalValue: found?.totalValue || 0,
      avgProbability: Math.round((found?.avgProbability || 0) * 100) / 100,
    };
  });
};

/**
 * Returns per-user performance metrics for admin/manager.
 * Includes: leads assigned, leads converted, deals created, deals won, revenue.
 *
 * @param {Date|string} [startDate]
 * @param {Date|string} [endDate]
 * @param {object}      [managerFilter] - { managerId } to scope to a manager's team
 * @returns {Array} User performance records
 */
exports.getTeamPerformance = async (startDate, endDate, managerFilter = null) => {
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  // Build user match for scoping to a manager's team
  const userMatch = { isActive: true };
  if (managerFilter) {
    userMatch.manager = managerFilter;
  }

  return User.aggregate([
    { $match: userMatch },
    // Lookup leads assigned to this user
    {
      $lookup: {
        from: 'leads',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$assignedTo', '$$userId'] },
              ...dateFilter,
            },
          },
        ],
        as: 'assignedLeads',
      },
    },
    // Lookup converted leads
    {
      $lookup: {
        from: 'leads',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$assignedTo', '$$userId'] },
              status: 'converted',
              ...dateFilter,
            },
          },
        ],
        as: 'convertedLeads',
      },
    },
    // Lookup all deals assigned to user
    {
      $lookup: {
        from: 'deals',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$assignedTo', '$$userId'] },
              ...dateFilter,
            },
          },
        ],
        as: 'allDeals',
      },
    },
    // Lookup won deals
    {
      $lookup: {
        from: 'deals',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$assignedTo', '$$userId'] },
              stage: 'won',
              ...dateFilter,
            },
          },
        ],
        as: 'wonDeals',
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        leadsAssigned: { $size: '$assignedLeads' },
        leadsConverted: { $size: '$convertedLeads' },
        dealsTotal: { $size: '$allDeals' },
        dealsWon: { $size: '$wonDeals' },
        totalWonValue: { $sum: '$wonDeals.value' },
        conversionRate: {
          $cond: [
            { $gt: [{ $size: '$assignedLeads' }, 0] },
            {
              $multiply: [
                { $divide: [{ $size: '$convertedLeads' }, { $size: '$assignedLeads' }] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { totalWonValue: -1 } },
  ]);
};

/**
 * Returns the most recent activities across the system.
 *
 * @param {number} [limit=10]
 * @returns {Array} Activity documents
 */
exports.getRecentActivities = async (limit = 10) => {
  // Mark overdue before fetching
  await Activity.updateMany(
    { dueDate: { $lt: new Date() }, status: 'pending' },
    { $set: { status: 'overdue' } }
  );

  return Activity.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name');
};

/**
 * Returns pending and overdue activities for a manager's team.
 * Used for "Monitor pending and overdue activities" — Sales Manager role.
 *
 * @param {string} managerId
 * @param {object} [filters] - { status?, type? }
 * @returns {Array} Activity documents
 */
exports.getTeamActivities = async (managerId, filters = {}) => {
  // Mark overdue first
  await Activity.updateMany(
    { dueDate: { $lt: new Date() }, status: 'pending' },
    { $set: { status: 'overdue' } }
  );

  const teamMembers = await User.find({ manager: managerId, isActive: true }).select('_id');
  const teamIds = [...teamMembers.map((m) => m._id), managerId];

  const query = { assignedTo: { $in: teamIds } };
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;

  return Activity.find(query)
    .sort({ dueDate: 1 })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name');
};
