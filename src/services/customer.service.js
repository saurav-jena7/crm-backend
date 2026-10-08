'use strict';

const Customer = require('../models/Customer.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

/**
 * Returns a paginated list of customers.
 * - Admin: all customers
 * - Sales Manager: customers assigned to their team or themselves
 * - Sales Executive: only their own customers
 */
exports.getAllCustomers = async (
  filters = {},
  user,
  page = 1,
  limit = 10,
  sort = '-createdAt'
) => {
  const query = { ...filters };

  if (user.role === 'sales_executive') {
    query.assignedTo = user._id;
  } else if (user.role === 'sales_manager') {
    const teamMembers = await User.find({ manager: user._id, isActive: true }).select('_id');
    const teamIds = teamMembers.map((m) => m._id);
    query.$or = [{ assignedTo: { $in: [...teamIds, user._id] } }, { assignedTo: null }];
  }

  const { skip, limit: parsedLimit } = paginate(null, page, limit);
  const sortObj = buildSortObject(sort);

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit),
    Customer.countDocuments(query),
  ]);

  return {
    customers,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
};

/**
 * Returns a single customer by ID with populated references.
 * @param {string} id
 * @returns {object} Customer document
 */
exports.getCustomer = async (id) => {
  const customer = await Customer.findById(id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name')
    .populate('originalLead', 'name email status');

  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
};

/**
 * Creates a new customer and records a timeline entry.
 * @param {object} data
 * @returns {object} Customer document
 */
exports.createCustomer = async (data) => {
  const customer = await Customer.create(data);

  await TimelineService.createTimelineEntry({
    action: 'Customer created',
    entityType: 'customer',
    entityId: customer._id,
    performedBy: data.createdBy,
  });

  return customer;
};

/**
 * Updates a customer and records a timeline entry.
 * @param {string} id
 * @param {object} data
 * @param {string} performedBy
 * @returns {object} Updated customer document
 */
exports.updateCustomer = async (id, data, performedBy) => {
  const existing = await Customer.findById(id);
  if (!existing) throw new AppError('Customer not found', 404);

  const previousValue = {
    name: existing.name,
    email: existing.email,
    status: existing.status,
  };

  const customer = await Customer.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  await TimelineService.createTimelineEntry({
    action: 'Customer updated',
    entityType: 'customer',
    entityId: id,
    performedBy,
    previousValue,
    newValue: data,
  });

  return customer;
};

/**
 * Deletes a customer by ID.
 * @param {string} id
 * @returns {object} Deleted customer document
 */
exports.deleteCustomer = async (id) => {
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
};
