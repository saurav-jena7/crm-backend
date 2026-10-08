'use strict';

const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard/stats — all authenticated users
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/pipeline — all authenticated users
router.get('/pipeline', dashboardController.getPipeline);

// GET /api/dashboard/team-performance — admin and sales_manager only
router.get(
  '/team-performance',
  authorize('admin', 'sales_manager'),
  dashboardController.getTeamPerformance
);

// GET /api/dashboard/team-activities — admin and sales_manager only
// Supports: ?status=pending|overdue|completed&type=call|email|...
// Sales Manager: monitors their team's pending/overdue activities
router.get(
  '/team-activities',
  authorize('admin', 'sales_manager'),
  dashboardController.getTeamActivities
);

// GET /api/dashboard/recent-activities — all authenticated users
router.get('/recent-activities', dashboardController.getRecentActivities);

module.exports = router;
