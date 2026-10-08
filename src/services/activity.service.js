'use strict';

const Activity = require('../models/Activity.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

/**
 * Bulk-marks pending activities whose dueDate is in the past as overdue.
 * Called automatically at the start of getAllActivities.
 */
exports.markOverdueActivities = async () => {
  await Activity.updateMany(
    { dueDate: { $lt: new Date() }, status: 'pending' },
    { $set: { status: 'overdue' } }
  );
};

/**
 * Returns a paginated list of activities.
 * Refreshes overdue statuses before querying.
 * - Admin: all activities
 * - Sales Manager: activities for their team + themselves
 * - Sales Executive: only their own activities
 *
 * @param {object} filters - { type?, status?, assignedTo?, dueDateFrom?, dueDateTo?, relatedId? }
 * @param {object} user  - { _id, role }
 * @param {number} page
 * @param {number} limit
 * @param {string} sort
 * @returns {{ activities, total, page, totalPages }}
 */
exports.getAllActivities = async (
  filters = {},
  user,
  page = 1,
  limit = 10,
  sort = '-createdAt'
) => {
  // Always refresh overdue status before listing
  await exports.markOverdueActivities();

  const query = {};

  // Apply explicit filters
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.relatedId) query['relatedTo.entity'] = filters.relatedId;

  // Due date range filter (for follow-up monitoring)
  if (filters.dueDateFrom || filters.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) query.dueDate.$gte = new Date(filters.dueDateFrom);
    if (filters.dueDateTo) query.dueDate.$lte = new Date(filters.dueDateTo);
  }

  // Role-based scoping
  if (user.role === 'sales_executive') {
    // Executives only see their own activities
    query.assignedTo = user._id;
  } else if (user.role === 'sales_manager') {
    // If assignedTo filter provided, honour it (manager drilling into a specific user)
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    } else {
      // See team activities
      const teamMembers = await User.find({ manager: user._id, isActive: true }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      query.assignedTo = { $in: [...teamIds, user._id] };
    }
  } else if (user.role === 'admin') {
    // Admin can filter by any assignedTo if provided
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  }

  const { skip, limit: parsedLimit } = paginate(null, page, limit);
  const sortObj = buildSortObject(sort);

  const [activities, total] = await Promise.all([
    Activity.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit),
    Activity.countDocuments(query),
  ]);

  return {
    activities,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
};

/**
 * Returns a single activity by ID.
 * Sales executives can only view activities assigned to them.
 *
 * @param {string} id
 * @param {object} user - { _id, role }
 * @returns {object} Activity document
 */
exports.getActivity = async (id, user) => {
  const activity = await Activity.findById(id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name');

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
 * Creates a new activity and records a timeline entry.
 * @param {object} data
 * @returns {object} Activity document
 */
exports.createActivity = async (data) => {
  const activity = await Activity.create(data);

  // Only create a timeline entry when the activity is linked to an entity
  if (activity.relatedTo && activity.relatedTo.entity) {
    await TimelineService.createTimelineEntry({
      action: `${activity.type} activity created`,
      entityType: activity.relatedTo.entityType,
      entityId: activity.relatedTo.entity,
      performedBy: data.createdBy,
      description: `Activity: ${activity.title}`,
    });
  }

  return activity;
};

/**
 * Updates an activity.
 * Sales executives can only update activities assigned to them.
 *
 * @param {string} id
 * @param {object} data
 * @param {object} user - { _id, role }
 * @returns {object} Updated activity document
 */
exports.updateActivity = async (id, data, user) => {
  const existing = await Activity.findById(id);
  if (!existing) throw new AppError('Activity not found', 404);

  // Ownership check for executives
  if (
    user.role === 'sales_executive' &&
    String(existing.assignedTo) !== String(user._id)
  ) {
    throw new AppError('You can only update activities assigned to you', 403);
  }

  const activity = await Activity.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (existing.relatedTo && existing.relatedTo.entity) {
    await TimelineService.createTimelineEntry({
      action: 'Activity updated',
      entityType: existing.relatedTo.entityType,
      entityId: existing.relatedTo.entity,
      performedBy: user._id,
      description: `Activity: ${activity.title}`,
    });
  }

  return activity;
};

/**
 * Deletes an activity by ID.
 * Sales executives can only delete activities they created.
 *
 * @param {string} id
 * @param {object} user - { _id, role }
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
 *
 * @param {string} id
 * @param {object} user - { _id, role }
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

  activity.status = 'completed';
  activity.completedAt = new Date();
  await activity.save();

  if (activity.relatedTo && activity.relatedTo.entity) {
    await TimelineService.createTimelineEntry({
      action: 'Activity completed',
      entityType: activity.relatedTo.entityType,
      entityId: activity.relatedTo.entity,
      performedBy: user._id,
      description: `Activity: ${activity.title}`,
    });
  }

  return activity;
};
