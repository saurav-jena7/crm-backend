'use strict';

const Activity = require('../models/Activity.model');
const User     = require('../models/User.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

/**
 * Bulk-marks pending activities whose dueDate is in the past as overdue.
 * Called before any list or single-fetch to keep status current.
 */
exports.markOverdueActivities = async () => {
  await Activity.updateMany(
    { dueDate: { $lt: new Date() }, status: 'pending' },
    { $set: { status: 'overdue' } }
  );
};

/**
 * Returns a paginated, filtered list of activities.
 * Refreshes overdue statuses before querying.
 *
 * Filters: type, status, assignedTo, dueDateFrom, dueDateTo, relatedId, relatedType
 * Role scoping:
 *   Admin         → all activities
 *   Sales Manager → their team's activities
 *   Sales Exec    → only their own
 *
 * @param {object} filters
 * @param {object} user
 * @param {number} page
 * @param {number} limit
 * @param {string} sort
 * @returns {{ activities, pagination }}
 */
exports.getAllActivities = async (
  filters = {},
  user,
  page  = 1,
  limit = 10,
  sort  = '-createdAt'
) => {
  await exports.markOverdueActivities();

  const query = {};

  // ── Explicit filters ───────────────────────────────────────────────────────
  if (filters.type)        query.type   = filters.type;
  if (filters.status)      query.status = filters.status;
  // Filter by related entity
  if (filters.relatedId)   query['relatedTo.entityId']   = filters.relatedId;
  if (filters.relatedType) query['relatedTo.entityType'] = filters.relatedType;

  // Due date range
  if (filters.dueDateFrom || filters.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) query.dueDate.$gte = new Date(filters.dueDateFrom);
    if (filters.dueDateTo)   query.dueDate.$lte = new Date(filters.dueDateTo);
  }

  // ── Role-based scoping ─────────────────────────────────────────────────────
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

/**
 * Returns a single activity by ID.
 * Also marks it overdue if dueDate has passed.
 * Sales executives can only view their own activities.
 *
 * @param {string} id
 * @param {object} user
 * @returns {object} Activity document
 */
exports.getActivity = async (id, user) => {
  // Mark overdue before returning the single record
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

/**
 * Creates a new activity and records a timeline entry if linked to an entity.
 *
 * @param {object} data
 * @returns {object} Activity document
 */
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
      entityId:    activity.relatedTo.entityId,   // ← correct field name
      performedBy: data.createdBy,
      description: `Activity: ${activity.title}`,
      newValue:    { type: activity.type, dueDate: activity.dueDate, status: activity.status },
    });
  }

  return activity;
};

/**
 * Updates an activity.
 * Sales executives can only update their own activities.
 * relatedTo cannot be changed after creation.
 *
 * @param {string} id
 * @param {object} data
 * @param {object} user
 * @returns {object} Updated activity document
 */
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

  // Timeline entry for lead/customer/deal entities
  if (
    existing.relatedTo &&
    existing.relatedTo.entityId &&
    existing.relatedTo.entityType !== 'user'
  ) {
    await TimelineService.createTimelineEntry({
      action:      'Activity updated',
      entityType:  existing.relatedTo.entityType,
      entityId:    existing.relatedTo.entityId,   // ← correct field name
      performedBy: user._id,
      description: `Activity: ${activity.title}`,
    });
  }

  return activity;
};

/**
 * Deletes an activity.
 * Sales executives can only delete activities they created.
 * Admins/managers can delete any activity.
 *
 * @param {string} id
 * @param {object} user
 * @returns {object} Deleted activity document
 */
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

/**
 * Marks an activity as completed, stamping completedAt.
 * Sales executives can only complete their own activities.
 * Backend determines overdue status independently of client input.
 *
 * @param {string} id
 * @param {object} user
 * @returns {object} Updated activity document
 */
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
      entityId:    activity.relatedTo.entityId,   // ← correct field name
      performedBy: user._id,
      description: `Activity "${activity.title}" marked completed`,
      newValue:    { status: 'completed', completedAt: activity.completedAt },
    });
  }

  return activity;
};
