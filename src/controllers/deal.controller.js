'use strict';

const dealService = require('../services/deal.service');

exports.getAllDeals = async (req, res, next) => {
  try {
    const {
      page, limit, sort,
      stage, assignedTo, customer, lead,
      minValue, maxValue,
      closingDateFrom, closingDateTo,
      search,
    } = req.query;

    const filters = {};
    if (stage)           filters.stage           = stage;
    if (assignedTo)      filters.assignedTo      = assignedTo;
    if (customer)        filters.customer        = customer;
    if (lead)            filters.lead            = lead;
    if (minValue)        filters.minValue        = minValue;
    if (maxValue)        filters.maxValue        = maxValue;
    if (closingDateFrom) filters.closingDateFrom = closingDateFrom;
    if (closingDateTo)   filters.closingDateTo   = closingDateTo;
    if (search)          filters.search          = search;

    const result = await dealService.getAllDeals(filters, req.user, page, limit, sort);

    res.status(200).json({
      success: true,
      message: 'Deals fetched successfully',
      data: result.deals,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

exports.getDeal = async (req, res, next) => {
  try {
    const deal = await dealService.getDeal(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Deal fetched successfully',
      data: { deal },
    });
  } catch (err) {
    next(err);
  }
};

exports.createDeal = async (req, res, next) => {
  try {
    const deal = await dealService.createDeal({ ...req.body, createdBy: req.user._id });
    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      data: { deal },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateDeal = async (req, res, next) => {
  try {
    const deal = await dealService.updateDeal(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Deal updated successfully',
      data: { deal },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteDeal = async (req, res, next) => {
  try {
    await dealService.deleteDeal(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Deal deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.updateDealStage = async (req, res, next) => {
  try {
    const deal = await dealService.updateDealStage(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: `Deal stage updated to "${deal.stage}"`,
      data: { deal },
    });
  } catch (err) {
    next(err);
  }
};
