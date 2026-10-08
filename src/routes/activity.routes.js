'use strict';

const express = require('express');
const router = express.Router();

const activityController = require('../controllers/activity.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createActivitySchema, updateActivitySchema } = require('../validators/activity.validators');

// All activity routes require authentication
router.use(authenticate);

// GET /api/activities
router.get('/', activityController.getAllActivities);

// POST /api/activities
router.post('/', validate(createActivitySchema), activityController.createActivity);

// GET /api/activities/:id
router.get('/:id', activityController.getActivity);

// PUT /api/activities/:id
router.put('/:id', validate(updateActivitySchema), activityController.updateActivity);

// DELETE /api/activities/:id — admin and sales_manager only
router.delete('/:id', authorize('admin', 'sales_manager'), activityController.deleteActivity);

// PATCH /api/activities/:id/complete
router.patch('/:id/complete', activityController.completeActivity);

module.exports = router;
