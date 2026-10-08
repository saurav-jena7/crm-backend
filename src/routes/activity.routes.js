'use strict';

const express = require('express');
const router = express.Router();

const activityController = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createActivitySchema, updateActivitySchema } = require('../validators/activity.validators');

// All activity routes require authentication
router.use(authenticate);

// GET /api/activities — filtered by role (exec=own, manager=team, admin=all)
router.get('/', activityController.getAllActivities);

// POST /api/activities — all roles can create activities
router.post('/', validate(createActivitySchema), activityController.createActivity);

// GET /api/activities/:id — exec can only view their own
router.get('/:id', activityController.getActivity);

// PUT /api/activities/:id — exec can only update their own (enforced in service)
router.put('/:id', validate(updateActivitySchema), activityController.updateActivity);

// DELETE /api/activities/:id — exec can only delete activities they created (service enforces)
router.delete('/:id', activityController.deleteActivity);

// PATCH /api/activities/:id/complete
router.patch('/:id/complete', activityController.completeActivity);

module.exports = router;
