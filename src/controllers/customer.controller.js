'use strict';

const customerService = require('../services/customer.service');

exports.getAllCustomers = async (req, res, next) => {
  try {
    const {
      page, limit, sort,
      status, assignedTo, search, dateFrom, dateTo,
    } = req.query;

    const filters = {};
    if (status)     filters.status     = status;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (search)     filters.search     = search;
    if (dateFrom)   filters.dateFrom   = dateFrom;
    if (dateTo)     filters.dateTo     = dateTo;

    const result = await customerService.getAllCustomers(filters, req.user, page, limit, sort);

    res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: result.customers,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const { customer, deals } = await customerService.getCustomer(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Customer fetched successfully',
      data: { customer, deals },
    });
  } catch (err) {
    next(err);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    await customerService.deleteCustomer(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
