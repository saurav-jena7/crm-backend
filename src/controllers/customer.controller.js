'use strict';

const customerService = require('../services/customer.service');

/**
 * GET /api/customers
 */
exports.getAllCustomers = async (req, res, next) => {
  try {
    const { page, limit, sort, assignedTo } = req.query;
    const filters = {};
    if (assignedTo) filters.assignedTo = assignedTo;

    const result = await customerService.getAllCustomers(filters, req.user, page, limit, sort);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/customers/:id
 */
exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomer(req.params.id);
    res.status(200).json({ success: true, data: { customer } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/customers
 */
exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: { customer } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/customers/:id
 */
exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body, req.user._id);
    res.status(200).json({ success: true, data: { customer } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/customers/:id
 */
exports.deleteCustomer = async (req, res, next) => {
  try {
    await customerService.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
