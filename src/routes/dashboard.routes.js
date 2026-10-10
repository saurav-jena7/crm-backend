'use strict';

const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/pipeline', dashboardController.getPipeline);
router.get('/team-performance', authorize('admin', 'sales_manager'), dashboardController.getTeamPerformance);
router.get('/team-activities', authorize('admin', 'sales_manager'), dashboardController.getTeamActivities);
router.get('/recent-activities', dashboardController.getRecentActivities);

module.exports = router;
