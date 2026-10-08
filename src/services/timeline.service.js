'use strict';

const Timeline = require('../models/Timeline.model');

/**
 * Creates a timeline entry. Supports optional Mongoose session for transactions.
 *
 * @param {Object} params
 * @param {string} params.action - Action description (e.g. 'Lead created').
 * @param {string} params.entityType - 'lead', 'customer', 'deal', or 'user'.
 * @param {ObjectId} params.entityId - ID of the related entity.
 * @param {ObjectId} params.performedBy - User ID who performed the action.
 * @param {*} [params.previousValue=null] - Optional snapshot of the old value.
 * @param {*} [params.newValue=null] - Optional snapshot of the new value.
 * @param {string} [params.description=''] - Optional extra details.
 * @param {import('mongoose').ClientSession} [params.session=null] - Optional Mongoose session for transactions.
 * @returns {Promise<import('mongoose').Document>} The created timeline entry.
 */
exports.createTimelineEntry = async ({
  action,
  entityType,
  entityId,
  performedBy,
  previousValue = null,
  newValue = null,
  description = '',
  session = null,
}) => {
  const doc = {
    action,
    entityType,
    entityId,
    performedBy,
    previousValue,
    newValue,
    description,
  };

  // Timeline.create([doc], { session }) returns an array; we extract the single entry
  const entries = await Timeline.create([doc], session ? { session } : {});
  return entries[0];
};

/**
 * Retrieves a paginated list of timeline entries for a specific entity.
 *
 * @param {string} entityType - 'lead', 'customer', 'deal', or 'user'.
 * @param {ObjectId} entityId - ID of the related entity.
 * @param {number} [page=1] - Page number (1-indexed).
 * @param {number} [limit=20] - Number of entries per page.
 * @returns {Promise<Object>} { entries, total, page, totalPages }
 */
exports.getTimeline = async (entityType, entityId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    Timeline.find({ entityType, entityId })
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Timeline.countDocuments({ entityType, entityId }),
  ]);

  return {
    entries,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};
