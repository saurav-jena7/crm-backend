'use strict';

const mongoose = require('mongoose');
const Lead = require('../models/Lead.model');
const Customer = require('../models/Customer.model');
const Deal = require('../models/Deal.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const TimelineService = require('./timeline.service');
const { paginate, buildSortObject } = require('../utils/helpers');

/**
 * Returns a paginated list of leads.
 * Sales executives only see their own leads.
 *
 * @param {object} filters
 * @param {object} user  - { _id, role }
 * @param {number} page
 * @param {number} limit
 * @param {string} sort
 * @returns {{ leads, total, page, totalPages }}
 */
exports.getAllLeads = async (filters = {}, user, page = 1, limit = 10, sort = '-createdAt') => {
  const query = { ...filters };

  if (user.role === 'sales_executive') {
    query.assignedTo = user._id;
  }

  const { skip, limit: parsedLimit } = paginate(null, page, limit);
  const sortObj = buildSortObject(sort);

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit),
    Lead.countDocuments(query),
  ]);

  return {
    leads,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
};

/**
 * Returns a single lead by ID.
 * Sales executives can only view leads assigned to them.
 *
 * @param {string} id
 * @param {object} user  - { _id, role }
 * @returns {object} Lead document
 */
exports.getLead = async (id, user) => {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name');

  if (!lead) throw new AppError('Lead not found', 404);

  if (
    user.role === 'sales_executive' &&
    lead.assignedTo &&
    String(lead.assignedTo._id) !== String(user._id)
  ) {
    throw new AppError('Access denied', 403);
  }

  return lead;
};

/**
 * Creates a new lead and records a timeline entry.
 * @param {object} data
 * @returns {object} Lead document
 */
exports.createLead = async (data) => {
  const lead = await Lead.create(data);

  await TimelineService.createTimelineEntry({
    action: 'Lead created',
    entityType: 'lead',
    entityId: lead._id,
    performedBy: data.createdBy,
  });

  return lead;
};

/**
 * Updates a lead and records a timeline entry.
 * @param {string} id
 * @param {object} data
 * @param {string} performedBy
 * @returns {object} Updated lead document
 */
exports.updateLead = async (id, data, performedBy) => {
  const existing = await Lead.findById(id);
  if (!existing) throw new AppError('Lead not found', 404);

  const previousValue = {
    name: existing.name,
    email: existing.email,
    status: existing.status,
    assignedTo: existing.assignedTo,
  };

  const lead = await Lead.findByIdAndUpdate(id, data, { new: true, runValidators: true });

  await TimelineService.createTimelineEntry({
    action: 'Lead updated',
    entityType: 'lead',
    entityId: id,
    performedBy,
    previousValue,
    newValue: data,
  });

  return lead;
};

/**
 * Deletes a lead by ID.
 * @param {string} id
 */
exports.deleteLead = async (id) => {
  const lead = await Lead.findByIdAndDelete(id);
  if (!lead) throw new AppError('Lead not found', 404);
  return lead;
};

/**
 * Changes the status of a lead and records a timeline entry.
 * @param {string} id
 * @param {string} status
 * @param {string} performedBy
 * @returns {object} Updated lead document
 */
exports.updateLeadStatus = async (id, status, performedBy) => {
  const lead = await Lead.findById(id);
  if (!lead) throw new AppError('Lead not found', 404);

  const previousValue = { status: lead.status };

  lead.status = status;
  await lead.save();

  await TimelineService.createTimelineEntry({
    action: 'Status changed',
    entityType: 'lead',
    entityId: id,
    performedBy,
    previousValue,
    newValue: { status },
  });

  return lead;
};

/**
 * Assigns a lead to a user and records a timeline entry.
 * @param {string} id
 * @param {string} assigneeId
 * @param {string} performedBy
 * @returns {object} Updated lead document
 */
exports.assignLead = async (id, assigneeId, performedBy) => {
  const assignee = await User.findById(assigneeId);
  if (!assignee) throw new AppError('Assignee user not found', 404);

  const lead = await Lead.findById(id);
  if (!lead) throw new AppError('Lead not found', 404);

  const previousValue = { assignedTo: lead.assignedTo };

  lead.assignedTo = assigneeId;
  await lead.save();

  await TimelineService.createTimelineEntry({
    action: 'Lead assigned',
    entityType: 'lead',
    entityId: id,
    performedBy,
    previousValue,
    newValue: { assignedTo: assigneeId },
  });

  return lead;
};

/**
 * Converts a lead into a Customer + Deal using a MongoDB transaction.
 *
 * @param {string} id - Lead ID to convert
 * @param {object} conversionData - { dealTitle, dealValue, dealStage, expectedCloseDate, customerData }
 * @param {string} performedBy - User ID performing the conversion
 * @returns {{ customer, deal }}
 */
exports.convertLead = async (
  id,
  { dealTitle, dealValue, dealStage, expectedCloseDate, customerData = {} },
  performedBy
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lead = await Lead.findById(id).session(session);
    if (!lead) throw new AppError('Lead not found', 404);
    if (lead.status === 'converted') throw new AppError('Lead is already converted', 400);

    // Create Customer — array form required when passing a session
    const customer = await Customer.create(
      [
        {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          ...customerData,
          originalLead: lead._id,
          assignedTo: lead.assignedTo,
          createdBy: performedBy,
        },
      ],
      { session }
    );

    // Create Deal linked to the new customer
    const deal = await Deal.create(
      [
        {
          title: dealTitle,
          lead: lead._id,
          customer: customer[0]._id,
          assignedTo: lead.assignedTo,
          value: dealValue,
          stage: dealStage || 'qualification',
          expectedCloseDate,
          createdBy: performedBy,
        },
      ],
      { session }
    );

    // Mark lead as converted
    await Lead.findByIdAndUpdate(
      id,
      {
        status: 'converted',
        convertedAt: new Date(),
        convertedCustomer: customer[0]._id,
        convertedDeal: deal[0]._id,
      },
      { session, new: true }
    );

    // Timeline entries — all inside the same session
    await TimelineService.createTimelineEntry({
      action: 'Lead converted to customer',
      entityType: 'lead',
      entityId: id,
      performedBy,
      session,
    });

    await TimelineService.createTimelineEntry({
      action: 'Customer created from lead',
      entityType: 'customer',
      entityId: customer[0]._id,
      performedBy,
      session,
    });

    await TimelineService.createTimelineEntry({
      action: 'Deal created from lead',
      entityType: 'deal',
      entityId: deal[0]._id,
      performedBy,
      session,
    });

    await session.commitTransaction();

    return { customer: customer[0], deal: deal[0] };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
