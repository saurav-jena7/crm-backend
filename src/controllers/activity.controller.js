'use strict';

const activityService = require('../services/activity.service');

exports.getAllActivities = async (req, res, next) => {
  try {
    const {
      page, limit, sort,
      type, status, assignedTo,
      dueDateFrom, dueDateTo,
      relatedId, relatedType,
    } = req.query;

    const filters = {};
    if (type)        filters.type        = type;
    if (status)      filters.status      = status;
    if (assignedTo)  filters.assignedTo  = assignedTo;
    if (dueDateFrom) filters.dueDateFrom = dueDateFrom;
    if (dueDateTo)   filters.dueDateTo   = dueDateTo;
    if (relatedId)   filters.relatedId   = relatedId;
    if (relatedType) filters.relatedType = relatedType;

    const result = await activityService.getAllActivities(filters, req.user, page, limit, sort);

    res.status(200).json({
      success:    true,
      message:    'Activities fetched successfully',
      data:       result.activities,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

exports.getActivity = async (req, res, next) => {
  try {
    const activity = await activityService.getActivity(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Activity fetched successfully',
      data:    { activity },
    });
  } catch (err) {
    next(err);
  }
};

exports.createActivity = async (req, res, next) => {
  try {
    const activity = await activityService.createActivity({
      ...req.body,
      createdBy:  req.user._id,
      assignedTo: req.body.assignedTo || req.user._id,
    });
    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
      data:    { activity },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateActivity = async (req, res, next) => {
  try {
    const activity = await activityService.updateActivity(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
      data:    { activity },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteActivity = async (req, res, next) => {
  try {
    await activityService.deleteActivity(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.completeActivity = async (req, res, next) => {
  try {
    const activity = await activityService.completeActivity(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Activity marked as completed',
      data:    { activity },
    });
  } catch (err) {
    next(err);
  }
};
