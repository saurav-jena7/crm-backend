'use strict';

const Activity = require('../models/Activity.model');
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
 * Sales executives only see their own activities.
 *
 * @param {object} filters
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

  const query = { ...filters };

  if (user.role === 'sales_executive') {
    query.assignedTo = user._id;
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
 * @param {string} id
 * @returns {object} Activity document
 */
exports.getActivity = async (id) => {
  const activity = await Activity.findById(id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name');

  if (!activity) throw new AppError('Activity not found', 404);
  return activity;
};

/**
 * Creates a new activity and records a timeline entry.
 * @param {object} data
 * @returns {object} Activity document
 */
exports.createActivity = async (data) => {
  const activity = await Activity.create(data);

  await TimelineService.createTimelineEntry({
    action: 'Activity created',
    entityType: activity.relatedTo.entityType,
    entityId: activity.relatedTo.entityId,
    performedBy: data.createdBy,
    description: `Activity: ${activity.title}`,
  });

  return activity;
};

/**
 * Updates an activity and records a timeline entry.
 * @param {string} id
 * @param {object} data
 * @param {string} performedBy
 * @returns {object} Updated activity document
 */
exports.updateActivity = async (id, data, performedBy) => {
  const existing = await Activity.findById(id);
  if (!existing) throw new AppError('Activity not found', 404);

  const activity = await Activity.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  await TimelineService.createTimelineEntry({
    action: 'Activity updated',
    entityType: existing.relatedTo.entityType,
    entityId: existing.relatedTo.entityId,
    performedBy,
    description: `Activity: ${activity.title}`,
  });

  return activity;
};

/**
 * Deletes an activity by ID.
 * @param {string} id
 * @returns {object} Deleted activity document
 */
exports.deleteActivity = async (id) => {
  const activity = await Activity.findByIdAndDelete(id);
  if (!activity) throw new AppError('Activity not found', 404);
  return activity;
};

/**
 * Marks an activity as completed, stamping completedAt.
 * @param {string} id
 * @param {string} performedBy
 * @returns {object} Updated activity document
 */
exports.completeActivity = async (id, performedBy) => {
  const activity = await Activity.findById(id);
  if (!activity) throw new AppError('Activity not found', 404);

  if (activity.status === 'completed') {
    throw new AppError('Activity is already completed', 400);
  }

  activity.status = 'completed';
  activity.completedAt = new Date();
  await activity.save();

  await TimelineService.createTimelineEntry({
    action: 'Activity completed',
    entityType: activity.relatedTo.entityType,
    entityId: activity.relatedTo.entityId,
    performedBy,
    description: `Activity: ${activity.title}`,
  });

  return activity;
};
