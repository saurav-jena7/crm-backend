'use strict';

const leadService = require('../services/lead.service');

/**
 * GET /api/leads
 * Query params: page, limit, sort, status, source, priority, assignedTo,
 *               search (keyword), dateFrom, dateTo
 * Multiple filters are supported in a single request.
 */
exports.getAllLeads = async (req, res, next) => {
  try {
    const {
      page, limit, sort,
      status, source, priority, assignedTo,
      search, dateFrom, dateTo,
    } = req.query;

    const filters = {};
    if (status)     filters.status     = status;
    if (source)     filters.source     = source;
    if (priority)   filters.priority   = priority;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (search)     filters.search     = search;
    if (dateFrom)   filters.dateFrom   = dateFrom;
    if (dateTo)     filters.dateTo     = dateTo;

    const result = await leadService.getAllLeads(filters, req.user, page, limit, sort);

    res.status(200).json({
      success: true,
      message: 'Leads fetched successfully',
      data: result.leads,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leads/:id
 */
exports.getLead = async (req, res, next) => {
  try {
    const lead = await leadService.getLead(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Lead fetched successfully',
      data: { lead },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/leads
 */
exports.createLead = async (req, res, next) => {
  try {
    const lead = await leadService.createLead({ ...req.body, createdBy: req.user._id });
    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: { lead },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/leads/:id
 */
exports.updateLead = async (req, res, next) => {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: { lead },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/leads/:id
 */
exports.deleteLead = async (req, res, next) => {
  try {
    await leadService.deleteLead(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/leads/:id/status
 */
exports.updateLeadStatus = async (req, res, next) => {
  try {
    const lead = await leadService.updateLeadStatus(req.params.id, req.body.status, req.user);
    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: { lead },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/leads/:id/assign
 */
exports.assignLead = async (req, res, next) => {
  try {
    const lead = await leadService.assignLead(req.params.id, req.body.assignedTo, req.user);
    res.status(200).json({
      success: true,
      message: 'Lead assigned successfully',
      data: { lead },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/leads/:id/convert
 * Returns the updated lead (with convertedCustomer + convertedDeal refs),
 * the new customer, and the new deal — showing the full Lead→Customer→Deal chain.
 */
exports.convertLead = async (req, res, next) => {
  try {
    const { lead, customer, deal } = await leadService.convertLead(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Lead converted successfully',
      data: {
        lead: {
          _id:               lead._id,
          name:              lead.name,
          status:            lead.status,
          convertedAt:       lead.convertedAt,
          convertedCustomer: lead.convertedCustomer,
          convertedDeal:     lead.convertedDeal,
        },
        customer,
        deal,
      },
    });
  } catch (err) {
    next(err);
  }
};
