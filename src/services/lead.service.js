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
 * Returns a paginated, filtered, sorted list of leads.
 *
 * Filters supported:
 *   status, source, priority, assignedTo — exact match
 *   search   — keyword across name, email, company (case-insensitive)
 *   dateFrom / dateTo — createdAt date range
 *
 * Role scoping:
 *   Admin          → all leads
 *   Sales Manager  → team leads (executives whose manager = this user) + unassigned
 *   Sales Executive→ only leads assigned to them
 *
 * @param {object} filters
 * @param {object} user  - { _id, role }
 * @param {number} page
 * @param {number} limit
 * @param {string} sort
 * @returns {{ leads, pagination }}
 */
exports.getAllLeads = async (filters = {}, user, page = 1, limit = 10, sort = '-createdAt') => {
  const query = {};

  // ── Exact-match filters ────────────────────────────────────────────────────
  if (filters.status)     query.status     = filters.status;
  if (filters.source)     query.source     = filters.source;
  if (filters.priority)   query.priority   = filters.priority;
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
    const teamMembers = await User.find({ manager: user._id, isActive: true }).select('_id');
    const teamIds = teamMembers.map((m) => m._id);
    // Merge with any existing assignedTo filter
    if (filters.assignedTo) {
      // Manager drilling into a specific team member — honour it
    } else {
      query.$or = [
        { assignedTo: { $in: [...teamIds, user._id] } },
        { assignedTo: null },
      ];
    }
  }

  const parsedPage  = Math.max(1, parseInt(page, 10)  || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const { skip }    = paginate(null, parsedPage, parsedLimit);
  const sortObj     = buildSortObject(sort || '-createdAt');

  const [leads, totalRecords] = await Promise.all([
    Lead.find(query)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit),
    Lead.countDocuments(query),
  ]);

  return {
    leads,
    pagination: {
      currentPage:  parsedPage,
      pageSize:     parsedLimit,
      totalRecords,
      totalPages:   Math.ceil(totalRecords / parsedLimit),
    },
  };
};

/**
 * Returns a single lead by ID with populated references.
 * Sales executives can only view leads assigned to them.
 *
 * @param {string} id
 * @param {object} user  - { _id, role }
 */
exports.getLead = async (id, user) => {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name')
    .populate('convertedCustomer', 'name email')
    .populate('convertedDeal', 'title stage value');

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
 */
exports.createLead = async (data) => {
  const lead = await Lead.create(data);

  await TimelineService.createTimelineEntry({
    action: 'Lead created',
    entityType: 'lead',
    entityId: lead._id,
    performedBy: data.createdBy,
    newValue: { status: lead.status, priority: lead.priority },
  });

  return lead;
};

/**
 * Updates a lead and records a timeline entry.
 * Sales executives can only update leads assigned to them.
 *
 * @param {string} id
 * @param {object} data
 * @param {object} user - { _id, role }
 */
exports.updateLead = async (id, data, user) => {
  const existing = await Lead.findById(id);
  if (!existing) throw new AppError('Lead not found', 404);

  // Ownership check for sales executives
  if (
    user.role === 'sales_executive' &&
    String(existing.assignedTo) !== String(user._id)
  ) {
    throw new AppError('You can only update leads assigned to you', 403);
  }

  // Block direct status change to 'converted' via update
  if (data.status === 'converted') {
    throw new AppError('Use the convert endpoint to convert a lead', 400);
  }

  const previousValue = {
    name:       existing.name,
    email:      existing.email,
    status:     existing.status,
    priority:   existing.priority,
    assignedTo: existing.assignedTo,
  };

  const lead = await Lead.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate('assignedTo', 'name email');

  await TimelineService.createTimelineEntry({
    action: 'Lead updated',
    entityType: 'lead',
    entityId: id,
    performedBy: user._id,
    previousValue,
    newValue: data,
  });

  return lead;
};

/**
 * Deletes a lead by ID (admin only — enforced at route level).
 * @param {string} id
 */
exports.deleteLead = async (id) => {
  const lead = await Lead.findByIdAndDelete(id);
  if (!lead) throw new AppError('Lead not found', 404);
  return lead;
};

/**
 * Changes the status of a lead and records a timeline entry.
 * - Sales executives can only update status on leads assigned to them.
 * - 'converted' status is blocked — use the convertLead endpoint.
 *
 * @param {string} id
 * @param {string} status
 * @param {object} user - { _id, role }
 */
exports.updateLeadStatus = async (id, status, user) => {
  const lead = await Lead.findById(id);
  if (!lead) throw new AppError('Lead not found', 404);

  if (
    user.role === 'sales_executive' &&
    String(lead.assignedTo) !== String(user._id)
  ) {
    throw new AppError('You can only update status of leads assigned to you', 403);
  }

  if (status === 'converted') {
    throw new AppError('Use the convert endpoint to convert a lead', 400);
  }

  const previousValue = { status: lead.status };
  lead.status = status;
  await lead.save();

  await TimelineService.createTimelineEntry({
    action: 'Lead status changed',
    entityType: 'lead',
    entityId: id,
    performedBy: user._id,
    previousValue,
    newValue: { status },
  });

  return lead;
};

/**
 * Assigns/reassigns a lead to a user.
 *
 * Rules (per spec section 6):
 *  - Admin can assign to any active sales_executive or sales_manager.
 *  - Sales Manager can only assign to executives on their own team
 *    (i.e. executives whose manager field === this manager's _id).
 *  - Sales Executive cannot call this endpoint (blocked at route level).
 *  - Assignee must exist, be active, and not be an admin.
 *  - Assignment change is recorded in the timeline.
 *  - Unauthorized assignment attempts are rejected with 403.
 *
 * @param {string} id          - Lead ID
 * @param {string} assigneeId  - User ID to assign the lead to
 * @param {object} performer   - Full user object { _id, role } of the requester
 */
exports.assignLead = async (id, assigneeId, performer) => {
  // Validate the assignee exists and is eligible
  const assignee = await User.findById(assigneeId);
  if (!assignee)          throw new AppError('Assignee not found', 404);
  if (!assignee.isActive) throw new AppError('Cannot assign lead to an inactive user', 400);
  if (assignee.role === 'admin') {
    throw new AppError('Leads can only be assigned to sales managers or sales executives', 400);
  }

  // Manager can only assign to executives on their own team
  if (performer.role === 'sales_manager') {
    if (assignee.role !== 'sales_executive') {
      throw new AppError('Sales managers can only assign leads to sales executives', 400);
    }
    // Check the executive belongs to this manager's team
    const isTeamMember =
      assignee.manager && String(assignee.manager) === String(performer._id);
    if (!isTeamMember) {
      throw new AppError(
        'You can only assign leads to sales executives on your team',
        403
      );
    }
  }

  const lead = await Lead.findById(id);
  if (!lead) throw new AppError('Lead not found', 404);

  const previousAssignee = lead.assignedTo;
  const action = previousAssignee ? 'Lead reassigned' : 'Lead assigned';

  lead.assignedTo = assigneeId;
  await lead.save();

  await TimelineService.createTimelineEntry({
    action,
    entityType: 'lead',
    entityId: id,
    performedBy: performer._id,
    previousValue: { assignedTo: previousAssignee },
    newValue: { assignedTo: assigneeId },
    description: `Assigned to ${assignee.name} (${assignee.role})`,
  });

  return lead.populate('assignedTo', 'name email role');
};

/**
 * Converts a qualified lead into a Customer + Deal atomically (MongoDB transaction).
 * - Admins/Managers can convert any qualified lead.
 * - Sales Executives can only convert leads assigned to them.
 *
 * @param {string} id
 * @param {object} conversionData
 * @param {object} performer - { _id, role }
 */
exports.convertLead = async (
  id,
  { dealTitle, dealValue, dealStage, expectedCloseDate, customerData = {} },
  performer
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lead = await Lead.findById(id).session(session);
    if (!lead) throw new AppError('Lead not found', 404);
    if (lead.status === 'converted') throw new AppError('Lead is already converted', 400);
    if (lead.status !== 'qualified') throw new AppError('Only qualified leads can be converted', 400);

    if (
      performer.role === 'sales_executive' &&
      String(lead.assignedTo) !== String(performer._id)
    ) {
      throw new AppError('You can only convert leads assigned to you', 403);
    }

    const [customer] = await Customer.create(
      [{
        name:    customerData.name    || lead.name,
        email:   customerData.email   || lead.email,
        phone:   customerData.phone   || lead.phone,
        company: customerData.company || lead.company,
        ...customerData,
        originalLead: lead._id,
        assignedTo:   lead.assignedTo,
        createdBy:    performer._id,
      }],
      { session }
    );

    const [deal] = await Deal.create(
      [{
        title:             dealTitle,
        lead:              lead._id,
        customer:          customer._id,
        assignedTo:        lead.assignedTo,
        value:             dealValue,
        stage:             dealStage || 'qualification',
        expectedCloseDate,
        createdBy:         performer._id,
      }],
      { session }
    );

    await Lead.findByIdAndUpdate(
      id,
      {
        status:            'converted',
        convertedAt:       new Date(),
        convertedCustomer: customer._id,
        convertedDeal:     deal._id,
      },
      { session }
    );

    await TimelineService.createTimelineEntry({
      action: 'Lead converted',
      entityType: 'lead',
      entityId: id,
      performedBy: performer._id,
      newValue: { convertedCustomer: customer._id, convertedDeal: deal._id },
      session,
    });

    await TimelineService.createTimelineEntry({
      action: 'Customer created from lead',
      entityType: 'customer',
      entityId: customer._id,
      performedBy: performer._id,
      session,
    });

    await TimelineService.createTimelineEntry({
      action: 'Deal created from lead',
      entityType: 'deal',
      entityId: deal._id,
      performedBy: performer._id,
      session,
    });

    await session.commitTransaction();
    return { customer, deal };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
