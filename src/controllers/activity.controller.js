'use strict';

const activityService = require('../services/activity.service');

/**
 * GET /api/activities
 */
exports.getAllActivities = async (req, res, next) => {
  try {
    const { page, limit, sort, type, status, assignedTo } = req.query;
    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (assignedTo) filters.assignedTo = assignedTo;

    const result = await activityService.getAllActivities(filters, req.user, page, limit, sort);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/activities/:id
 */
exports.getActivity = async (req, res, next) => {
  try {
    const activity = await activityService.getActivity(req.params.id);
    res.status(200).json({ success: true, data: { activity } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/activities
 */
exports.createActivity = async (req, res, next) => {
  try {
    const activity = await activityService.createActivity({
      ...req.body,
      createdBy: req.user._id,
      assignedTo: req.body.assignedTo || req.user._id,
    });
    res.status(201).json({ success: true, data: { activity } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/activities/:id
 */
exports.updateActivity = async (req, res, next) => {
  try {
    const activity = await activityService.updateActivity(req.params.id, req.body, req.user._id);
    res.status(200).json({ success: true, data: { activity } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/activities/:id
 */
exports.deleteActivity = async (req, res, next) => {
  try {
    await activityService.deleteActivity(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/activities/:id/complete
 */
exports.completeActivity = async (req, res, next) => {
  try {
    const activity = await activityService.completeActivity(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: { activity } });
  } catch (err) {
    next(err);
  }
};
