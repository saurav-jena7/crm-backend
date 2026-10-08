'use strict';

const Lead = require('../models/Lead.model');
const Deal = require('../models/Deal.model');
const Activity = require('../models/Activity.model');
const User = require('../models/User.model');

/**
 * Returns high-level CRM statistics.
 *
 * @returns {object} { leadsByStatus, dealsByStage, winRate, conversionRate, totalLeads, closedDeals, totalDealsValue }
 */
exports.getStats = async () => {
  const [
    leadsByStatus,
    dealsByStage,
    wonDeals,
    closedDeals,
    convertedLeads,
    totalLeads,
  ] = await Promise.all([
    Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Deal.aggregate([
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
    ]),
    Deal.countDocuments({ stage: 'won' }),
    Deal.countDocuments({ stage: { $in: ['won', 'lost'] } }),
    Lead.countDocuments({ status: 'converted' }),
    Lead.countDocuments(),
  ]);

  const winRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  const totalDealsValue = dealsByStage.reduce((sum, s) => sum + (s.totalValue || 0), 0);

  return {
    leadsByStatus,
    dealsByStage,
    winRate: Math.round(winRate * 100) / 100,
    conversionRate: Math.round(conversionRate * 100) / 100,
    totalLeads,
    convertedLeads,
    wonDeals,
    closedDeals,
    totalDealsValue,
  };
};

/**
 * Returns the active deal pipeline grouped by stage (excluding won/lost).
 *
 * @returns {Array} [{ _id, count, totalValue, avgProbability }]
 */
exports.getPipeline = async () => {
  return Deal.aggregate([
    { $match: { stage: { $nin: ['won', 'lost'] } } },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgProbability: { $avg: '$probability' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * Returns per-user performance metrics (won deals) within an optional date range.
 *
 * @param {Date|string} [startDate]
 * @param {Date|string} [endDate]
 * @returns {Array} User performance records
 */
exports.getTeamPerformance = async (startDate, endDate) => {
  const wonMatch = { stage: 'won' };
  if (startDate || endDate) {
    wonMatch.wonAt = {};
    if (startDate) wonMatch.wonAt.$gte = new Date(startDate);
    if (endDate) wonMatch.wonAt.$lte = new Date(endDate);
  }

  return User.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'deals',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$assignedTo', '$$userId'] },
              ...wonMatch,
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
        wonDealsCount: { $size: '$wonDeals' },
        totalWonValue: { $sum: '$wonDeals.value' },
      },
    },
    { $sort: { totalWonValue: -1 } },
  ]);
};

/**
 * Returns the most recent activities.
 *
 * @param {number} [limit=10]
 * @returns {Array} Activity documents
 */
exports.getRecentActivities = async (limit = 10) => {
  return Activity.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('assignedTo', 'name')
    .populate('createdBy', 'name');
};
