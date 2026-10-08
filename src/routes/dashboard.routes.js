'use strict';

const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/pipeline
router.get('/pipeline', dashboardController.getPipeline);

// GET /api/dashboard/team-performance — admin and sales_manager only
router.get(
  '/team-performance',
  authorize('admin', 'sales_manager'),
  dashboardController.getTeamPerformance
);

// GET /api/dashboard/recent-activities
router.get('/recent-activities', dashboardController.getRecentActivities);

module.exports = router;
