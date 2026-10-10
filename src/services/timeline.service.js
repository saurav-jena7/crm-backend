'use strict';

const Timeline = require('../models/Timeline.model');

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

  // array form required when passing a session
  const entries = await Timeline.create([doc], session ? { session } : {});
  return entries[0];
};

exports.getTimeline = async (entityType, entityId, page = 1, limit = 20) => {
  const parsedPage  = Math.max(1, parseInt(page,  10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip        = (parsedPage - 1) * parsedLimit;

  const [entries, totalRecords] = await Promise.all([
    Timeline.find({ entityType, entityId })
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Timeline.countDocuments({ entityType, entityId }),
  ]);

  return {
    entries,
    pagination: {
      currentPage:  parsedPage,
      pageSize:     parsedLimit,
      totalRecords,
      totalPages:   Math.ceil(totalRecords / parsedLimit),
    },
  };
};
