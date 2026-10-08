'use strict';

const dashboardService = require('../services/dashboard.service');

/**
 * GET /api/dashboard/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats();
    res.status(200).json({ success: true, data: { stats } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/pipeline
 */
exports.getPipeline = async (req, res, next) => {
  try {
    const pipeline = await dashboardService.getPipeline();
    res.status(200).json({ success: true, data: { pipeline } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/team-performance
 */
exports.getTeamPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const performance = await dashboardService.getTeamPerformance(startDate, endDate);
    res.status(200).json({ success: true, data: { performance } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/recent-activities
 */
exports.getRecentActivities = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const activities = await dashboardService.getRecentActivities(limit);
    res.status(200).json({ success: true, data: { activities } });
  } catch (err) {
    next(err);
  }
};
