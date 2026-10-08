'use strict';

const leadService = require('../services/lead.service');

/**
 * GET /api/leads
 */
exports.getAllLeads = async (req, res, next) => {
  try {
    const { page, limit, sort, status, source, priority, assignedTo } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (source) filters.source = source;
    if (priority) filters.priority = priority;
    if (assignedTo) filters.assignedTo = assignedTo;

    const result = await leadService.getAllLeads(filters, req.user, page, limit, sort);
    res.status(200).json({ success: true, data: result });
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
    res.status(200).json({ success: true, data: { lead } });
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
    res.status(201).json({ success: true, data: { lead } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/leads/:id
 */
exports.updateLead = async (req, res, next) => {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body, req.user._id);
    res.status(200).json({ success: true, data: { lead } });
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
    res.status(204).send();
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
    res.status(200).json({ success: true, message: 'Lead status updated', data: { lead } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/leads/:id/assign
 */
exports.assignLead = async (req, res, next) => {
  try {
    const lead = await leadService.assignLead(req.params.id, req.body.assignedTo, req.user._id);
    res.status(200).json({ success: true, message: 'Lead assigned successfully', data: { lead } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/leads/:id/convert
 */
exports.convertLead = async (req, res, next) => {
  try {
    const { customer, deal } = await leadService.convertLead(
      req.params.id,
      req.body,
      req.user   // pass full user object for role check
    );
    res.status(200).json({ success: true, message: 'Lead converted successfully', data: { customer, deal } });
  } catch (err) {
    next(err);
  }
};
