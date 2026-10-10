'use strict';

const express = require('express');
const router = express.Router();

const timelineController = require('../controllers/timeline.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/lead/:id', timelineController.getLeadTimeline);
router.get('/customer/:id', timelineController.getCustomerTimeline);
router.get('/deal/:id', timelineController.getDealTimeline);

module.exports = router;
