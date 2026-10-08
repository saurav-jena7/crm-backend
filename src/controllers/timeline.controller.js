'use strict';

const TimelineService = require('../services/timeline.service');

/**
 * GET /api/timeline/lead/:id
 */
exports.getLeadTimeline = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await TimelineService.getTimeline('lead', req.params.id, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/timeline/customer/:id
 */
exports.getCustomerTimeline = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await TimelineService.getTimeline('customer', req.params.id, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/timeline/deal/:id
 */
exports.getDealTimeline = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await TimelineService.getTimeline('deal', req.params.id, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
