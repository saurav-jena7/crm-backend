'use strict';

const Lead     = require('../models/Lead.model');
const Deal     = require('../models/Deal.model');
const Customer = require('../models/Customer.model');
const Activity = require('../models/Activity.model');
const User     = require('../models/User.model');

const refreshOverdue = () =>
  Activity.updateMany(
    { dueDate: { $lt: new Date() }, status: 'pending' },
    { $set: { status: 'overdue' } }
  );

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
    Deal.aggregate([
      { $match: { stage: 'won' } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]),
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
    leads: {
      total:       totalLeads,
      new:         newLeads,
      contacted:   contactedLeads,
      qualified:   qualifiedLeads,
      converted:   convertedLeads,
      unqualified: unqualifiedLeads,
      lost:        lostLeads,
    },
    customers: {
      total:  totalCustomers,
      active: activeCustomers,
    },
    deals: {
      total: totalDeals,
      open:  openDeals,
      won:   wonDeals,
      lost:  lostDeals,
    },
    revenue: {
      total:    Math.round(totalRevenue    * 100) / 100,
      expected: Math.round(expectedRevenue * 100) / 100,
    },
    activities: {
      pending:  pendingActivities,
      overdue:  overdueActivities,
    },
    rates: {
      conversionRate, // converted leads / total leads × 100
      winRate,        // won deals / closed deals × 100
    },
  };
};

exports.getPipeline = async () => {
  const stageOrder = ['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];

  const results = await Deal.aggregate([
    {
      $group: {
        _id:             '$stage',
        count:           { $sum: 1 },
        totalValue:      { $sum: '$value' },
        expectedRevenue: { $sum: '$expectedRevenue' },
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
        pendingActivities:  { $size: '$pendingActivities' },
        overdueActivities:  { $size: '$overdueActivities' },
      },
    },
    { $sort: { totalWonValue: -1 } },
  ]);
};

exports.getRecentActivities = async (limit = 10) => {
  await refreshOverdue();

  return Activity.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('assignedTo', 'name email role')
    .populate('createdBy',  'name');
};

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
