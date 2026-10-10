'use strict';

const express = require('express');
const router = express.Router();

const activityController = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createActivitySchema, updateActivitySchema } = require('../validators/activity.validators');

router.use(authenticate);

router.get('/', activityController.getAllActivities);
router.post('/', validate(createActivitySchema), activityController.createActivity);
router.get('/:id', activityController.getActivity);
router.put('/:id', validate(updateActivitySchema), activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);
router.patch('/:id/complete', activityController.completeActivity);

module.exports = router;
