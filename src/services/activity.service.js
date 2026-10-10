'use strict';

const Activity = require('../models/Activity.model');
const User     = require('../models/User.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

exports.markOverdueActivities = async () => {
  await Activity.updateMany(
    { dueDate: { $lt: new Date() }, status: 'pending' },
    { $set: { status: 'overdue' } }
  );
};

exports.getAllActivities = async (
  filters = {},
  user,
  page  = 1,
  limit = 10,
  sort  = '-createdAt'
) => {
  await exports.markOverdueActivities();

  const query = {};

  if (filters.type)        query.type   = filters.type;
  if (filters.status)      query.status = filters.status;
  if (filters.relatedId)   query['relatedTo.entityId']   = filters.relatedId;
  if (filters.relatedType) query['relatedTo.entityType'] = filters.relatedType;

  if (filters.dueDateFrom || filters.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) query.dueDate.$gte = new Date(filters.dueDateFrom);
    if (filters.dueDateTo)   query.dueDate.$lte = new Date(filters.dueDateTo);
  }

  if (user.role === 'sales_executive') {
    query.assignedTo = user._id;
  } else if (user.role === 'sales_manager') {
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    } else {
      const teamMembers = await User.find({ manager: user._id, isActive: true }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      query.assignedTo = { $in: [...teamIds, user._id] };
    }
  } else if (user.role === 'admin') {
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  }

  const parsedPage  = Math.max(1, parseInt(page,  10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const { skip }    = paginate(null, parsedPage, parsedLimit);
  const sortObj     = buildSortObject(sort || '-createdAt');

  const [activities, totalRecords] = await Promise.all([
    Activity.find(query)
      .populate('assignedTo', 'name email role')
      .populate('createdBy',  'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Activity.countDocuments(query),
  ]);

  return {
    activities,
    pagination: {
      currentPage:  parsedPage,
      pageSize:     parsedLimit,
      totalRecords,
      totalPages:   Math.ceil(totalRecords / parsedLimit),
    },
  };
};

exports.getActivity = async (id, user) => {
  await exports.markOverdueActivities();

  const activity = await Activity.findById(id)
    .populate('assignedTo', 'name email role')
    .populate('createdBy',  'name');

  if (!activity) throw new AppError('Activity not found', 404);

  if (
    user.role === 'sales_executive' &&
    String(activity.assignedTo?._id || activity.assignedTo) !== String(user._id)
  ) {
    throw new AppError('Access denied', 403);
  }

  return activity;
};

exports.createActivity = async (data) => {
  const activity = await Activity.create(data);

  // Record in timeline only when linked to a lead, customer, or deal
  if (
    activity.relatedTo &&
    activity.relatedTo.entityId &&
    activity.relatedTo.entityType !== 'user'
  ) {
    await TimelineService.createTimelineEntry({
      action:      `${activity.type} activity created`,
      entityType:  activity.relatedTo.entityType,
      entityId:    activity.relatedTo.entityId,
      performedBy: data.createdBy,
      description: `Activity: ${activity.title}`,
      newValue:    { type: activity.type, dueDate: activity.dueDate, status: activity.status },
    });
  }

  return activity;
};

exports.updateActivity = async (id, data, user) => {
  const existing = await Activity.findById(id);
  if (!existing) throw new AppError('Activity not found', 404);

  if (
    user.role === 'sales_executive' &&
    String(existing.assignedTo) !== String(user._id)
  ) {
    throw new AppError('You can only update activities assigned to you', 403);
  }

  // Protect relatedTo from being changed after creation
  const safeData = { ...data };
  delete safeData.relatedTo;
  delete safeData.createdBy;

  const activity = await Activity.findByIdAndUpdate(id, safeData, {
    new: true,
    runValidators: true,
  })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name');

  if (
    existing.relatedTo &&
    existing.relatedTo.entityId &&
    existing.relatedTo.entityType !== 'user'
  ) {
    await TimelineService.createTimelineEntry({
      action:      'Activity updated',
      entityType:  existing.relatedTo.entityType,
      entityId:    existing.relatedTo.entityId,
      performedBy: user._id,
      description: `Activity: ${activity.title}`,
    });
  }

  return activity;
};

exports.deleteActivity = async (id, user) => {
  const activity = await Activity.findById(id);
  if (!activity) throw new AppError('Activity not found', 404);

  if (
    user.role === 'sales_executive' &&
    String(activity.createdBy) !== String(user._id)
  ) {
    throw new AppError('You can only delete activities you created', 403);
  }

  await Activity.findByIdAndDelete(id);
  return activity;
};

exports.completeActivity = async (id, user) => {
  const activity = await Activity.findById(id);
  if (!activity) throw new AppError('Activity not found', 404);

  if (
    user.role === 'sales_executive' &&
    String(activity.assignedTo) !== String(user._id)
  ) {
    throw new AppError('You can only complete activities assigned to you', 403);
  }

  if (activity.status === 'completed') {
    throw new AppError('Activity is already completed', 400);
  }

  activity.status      = 'completed';
  activity.completedAt = new Date();
  await activity.save();

  if (
    activity.relatedTo &&
    activity.relatedTo.entityId &&
    activity.relatedTo.entityType !== 'user'
  ) {
    await TimelineService.createTimelineEntry({
      action:      'Follow-up completed',
      entityType:  activity.relatedTo.entityType,
      entityId:    activity.relatedTo.entityId,
      performedBy: user._id,
      description: `Activity "${activity.title}" marked completed`,
      newValue:    { status: 'completed', completedAt: activity.completedAt },
    });
  }

  return activity;
};
