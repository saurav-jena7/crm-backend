'use strict';

const express = require('express');
const router = express.Router();

const timelineController = require('../controllers/timeline.controller');
const { authenticate } = require('../middleware/auth');

// All timeline routes require authentication
router.use(authenticate);

// GET /api/timeline/lead/:id
router.get('/lead/:id', timelineController.getLeadTimeline);

// GET /api/timeline/customer/:id
router.get('/customer/:id', timelineController.getCustomerTimeline);

// GET /api/timeline/deal/:id
router.get('/deal/:id', timelineController.getDealTimeline);

module.exports = router;
