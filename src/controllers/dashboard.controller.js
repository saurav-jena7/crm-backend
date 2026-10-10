'use strict';

const dashboardService = require('../services/dashboard.service');

exports.getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats();
    res.status(200).json({ success: true, message: 'Stats fetched successfully', data: { stats } });
  } catch (err) {
    next(err);
  }
};

exports.getPipeline = async (req, res, next) => {
  try {
    const pipeline = await dashboardService.getPipeline();
    res.status(200).json({ success: true, message: 'Pipeline fetched successfully', data: { pipeline } });
  } catch (err) {
    next(err);
  }
};

exports.getTeamPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Managers only see their own team's performance
    const managerFilter =
      req.user.role === 'sales_manager' ? req.user._id : null;

    const performance = await dashboardService.getTeamPerformance(
      startDate,
      endDate,
      managerFilter
    );
    res.status(200).json({
      success: true,
      message: 'Team performance fetched successfully',
      data: { performance },
    });
  } catch (err) {
    next(err);
  }
};

exports.getRecentActivities = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const activities = await dashboardService.getRecentActivities(limit);
    res.status(200).json({
      success: true,
      message: 'Recent activities fetched successfully',
      data: { activities },
    });
  } catch (err) {
    next(err);
  }
};

exports.getTeamActivities = async (req, res, next) => {
  try {
    const { status, type } = req.query;

    // Manager sees their own team. Admin can pass ?managerId=xxx to scope.
    const managerId =
      req.user.role === 'sales_manager'
        ? req.user._id
        : req.query.managerId || null;

    if (!managerId) {
      return res.status(400).json({ success: false, message: 'managerId is required for admin' });
    }

    const activities = await dashboardService.getTeamActivities(managerId, { status, type });
    res.status(200).json({
      success: true,
      message: 'Team activities fetched successfully',
      data: { activities },
    });
  } catch (err) {
    next(err);
  }
};
