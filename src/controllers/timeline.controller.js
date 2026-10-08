'use strict';

const TimelineService = require('../services/timeline.service');

/**
 * GET /api/timeline/lead/:id
 * Returns chronological audit trail for a lead.
 */
exports.getLeadTimeline = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await TimelineService.getTimeline('lead', req.params.id, page, limit);
    res.status(200).json({
      success:    true,
      message:    'Lead timeline fetched successfully',
      data:       result.entries,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/timeline/customer/:id
 * Returns chronological audit trail for a customer.
 */
exports.getCustomerTimeline = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await TimelineService.getTimeline('customer', req.params.id, page, limit);
    res.status(200).json({
      success:    true,
      message:    'Customer timeline fetched successfully',
      data:       result.entries,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/timeline/deal/:id
 * Returns chronological audit trail for a deal.
 */
exports.getDealTimeline = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await TimelineService.getTimeline('deal', req.params.id, page, limit);
    res.status(200).json({
      success:    true,
      message:    'Deal timeline fetched successfully',
      data:       result.entries,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};
