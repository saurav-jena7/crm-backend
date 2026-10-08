'use strict';

const Customer = require('../models/Customer.model');
const Deal     = require('../models/Deal.model');
const User     = require('../models/User.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

/**
 * Returns a paginated, filtered, sorted list of customers.
 *
 * Filters: status, assignedTo, search (name/email/company), dateFrom, dateTo
 * Role scoping:
 *   Admin         → all customers
 *   Sales Manager → team customers (assignedTo in their team) + unassigned
 *   Sales Exec    → only their own customers
 *
 * @param {object} filters
 * @param {object} user
 * @param {number} page
 * @param {number} limit
 * @param {string} sort
 * @returns {{ customers, pagination }}
 */
exports.getAllCustomers = async (
  filters = {},
  user,
  page  = 1,
  limit = 10,
  sort  = '-createdAt'
) => {
  const query = {};

  // ── Exact-match filters ────────────────────────────────────────────────────
  if (filters.status)     query.status     = filters.status;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;

  // ── Keyword search across name, email, company ─────────────────────────────
  if (filters.search && filters.search.trim()) {
    const regex = new RegExp(filters.search.trim(), 'i');
    query.$or = [{ name: regex }, { email: regex }, { company: regex }];
  }

  // ── Date-range filter on createdAt ─────────────────────────────────────────
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo)   query.createdAt.$lte = new Date(filters.dateTo);
  }

  // ── Role-based scoping ────────────────────────────────────────────────────
  if (user.role === 'sales_executive') {
    query.assignedTo = user._id;
  } else if (user.role === 'sales_manager') {
    if (!filters.assignedTo) {
      const teamMembers = await User.find({ manager: user._id, isActive: true }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      query.$or = [
        { assignedTo: { $in: [...teamIds, user._id] } },
        { assignedTo: null },
      ];
    }
  }

  const parsedPage  = Math.max(1, parseInt(page,  10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const { skip }    = paginate(null, parsedPage, parsedLimit);
  const sortObj     = buildSortObject(sort || '-createdAt');

  const [customers, totalRecords] = await Promise.all([
    Customer.find(query)
      .populate('originalLead', 'name email status')
      .populate('assignedTo',   'name email role')
      .populate('createdBy',    'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Customer.countDocuments(query),
  ]);

  return {
    customers,
    pagination: {
      currentPage:  parsedPage,
      pageSize:     parsedLimit,
      totalRecords,
      totalPages:   Math.ceil(totalRecords / parsedLimit),
    },
  };
};

/**
 * Returns a single customer by ID.
 * Populates: originalLead, assignedTo, createdBy, and associated deals.
 * Sales executives can only view customers assigned to them.
 *
 * @param {string} id
 * @param {object} user
 * @returns {object} Customer document with associated deals
 */
exports.getCustomer = async (id, user) => {
  const customer = await Customer.findById(id)
    .populate('originalLead', 'name email status source priority convertedAt')
    .populate('assignedTo',   'name email role')
    .populate('createdBy',    'name');

  if (!customer) throw new AppError('Customer not found', 404);

  // Ownership check for sales executives
  if (
    user.role === 'sales_executive' &&
    String(customer.assignedTo?._id || customer.assignedTo) !== String(user._id)
  ) {
    throw new AppError('Access denied', 403);
  }

  // Fetch associated deals to retain the relationship with deals (spec requirement)
  const deals = await Deal.find({ customer: id })
    .select('title stage value probability expectedRevenue expectedCloseDate wonAt lostAt')
    .sort('-createdAt');

  return { customer, deals };
};

/**
 * Creates a new customer and records a timeline entry.
 * @param {object} data
 * @returns {object} Customer document
 */
exports.createCustomer = async (data) => {
  const customer = await Customer.create(data);

  await TimelineService.createTimelineEntry({
    action:      'Customer created',
    entityType:  'customer',
    entityId:    customer._id,
    performedBy: data.createdBy,
    newValue:    { name: customer.name, status: customer.status },
  });

  return customer;
};

/**
 * Updates a customer and records a timeline entry.
 * Sales executives can only update customers assigned to them.
 * originalLead cannot be changed after creation.
 *
 * @param {string} id
 * @param {object} data
 * @param {object} user
 * @returns {object} Updated customer document
 */
exports.updateCustomer = async (id, data, user) => {
  const existing = await Customer.findById(id);
  if (!existing) throw new AppError('Customer not found', 404);

  // Ownership check for executives
  if (
    user.role === 'sales_executive' &&
    String(existing.assignedTo) !== String(user._id)
  ) {
    throw new AppError('You can only update customers assigned to you', 403);
  }

  // Protect immutable fields
  const safeData = { ...data };
  delete safeData.originalLead; // cannot be changed after creation
  delete safeData.createdBy;    // cannot be changed

  const previousValue = {
    name:   existing.name,
    email:  existing.email,
    status: existing.status,
  };

  const customer = await Customer.findByIdAndUpdate(id, safeData, {
    new: true,
    runValidators: true,
  })
    .populate('originalLead', 'name email status')
    .populate('assignedTo',   'name email role');

  await TimelineService.createTimelineEntry({
    action:      'Customer updated',
    entityType:  'customer',
    entityId:    id,
    performedBy: user._id,
    previousValue,
    newValue:    { name: customer.name, email: customer.email, status: customer.status },
  });

  return customer;
};

/**
 * Deletes a customer by ID (admin/manager only — enforced at route level).
 * @param {string} id
 * @returns {object} Deleted customer document
 */
exports.deleteCustomer = async (id) => {
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
};
