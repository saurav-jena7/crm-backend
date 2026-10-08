'use strict';

const express = require('express');
const router = express.Router();

const leadController = require('../controllers/lead.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
  convertLeadSchema,
} = require('../validators/lead.validators');

// All lead routes require authentication
router.use(authenticate);

// GET /api/leads
router.get('/', leadController.getAllLeads);

// POST /api/leads — all roles can create leads
router.post('/', validate(createLeadSchema), leadController.createLead);

// GET /api/leads/:id
router.get('/:id', leadController.getLead);

// PUT /api/leads/:id — sales_executive can only update their own (enforced in service)
router.put('/:id', validate(updateLeadSchema), leadController.updateLead);

// DELETE /api/leads/:id — admin only
router.delete('/:id', authorize('admin'), leadController.deleteLead);

// PATCH /api/leads/:id/status — all roles; service enforces ownership for executives
router.patch('/:id/status', validate(updateLeadStatusSchema), leadController.updateLeadStatus);

// PATCH /api/leads/:id/assign — admin and sales_manager only
router.patch(
  '/:id/assign',
  authorize('admin', 'sales_manager'),
  validate(assignLeadSchema),
  leadController.assignLead
);

// POST /api/leads/:id/convert — all roles; only sales_executive converts their assigned leads,
// admin/manager can convert any qualified lead
router.post(
  '/:id/convert',
  validate(convertLeadSchema),
  leadController.convertLead
);

module.exports = router;
