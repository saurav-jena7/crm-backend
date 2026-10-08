'use strict';

const dealService = require('../services/deal.service');

/**
 * GET /api/deals
 */
exports.getAllDeals = async (req, res, next) => {
  try {
    const { page, limit, sort, stage, customer, lead } = req.query;
    const filters = {};
    if (stage) filters.stage = stage;
    if (customer) filters.customer = customer;
    if (lead) filters.lead = lead;

    const result = await dealService.getAllDeals(filters, req.user, page, limit, sort);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/deals/:id
 */
exports.getDeal = async (req, res, next) => {
  try {
    const deal = await dealService.getDeal(req.params.id);
    res.status(200).json({ success: true, data: { deal } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/deals
 */
exports.createDeal = async (req, res, next) => {
  try {
    const deal = await dealService.createDeal({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: { deal } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/deals/:id
 */
exports.updateDeal = async (req, res, next) => {
  try {
    const deal = await dealService.updateDeal(req.params.id, req.body, req.user._id);
    res.status(200).json({ success: true, data: { deal } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/deals/:id
 */
exports.deleteDeal = async (req, res, next) => {
  try {
    await dealService.deleteDeal(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/deals/:id/stage
 */
exports.updateDealStage = async (req, res, next) => {
  try {
    const deal = await dealService.updateDealStage(
      req.params.id,
      req.body,
      req.user._id,
      req.user.role
    );
    res.status(200).json({ success: true, data: { deal } });
  } catch (err) {
    next(err);
  }
};
