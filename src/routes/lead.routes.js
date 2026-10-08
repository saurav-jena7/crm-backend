'use strict';

const express = require('express');
const router = express.Router();

const leadController = require('../controllers/lead.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  convertLeadSchema,
} = require('../validators/lead.validators');

// All lead routes require authentication
router.use(authenticate);

// GET /api/leads
router.get('/', leadController.getAllLeads);

// POST /api/leads
router.post('/', validate(createLeadSchema), leadController.createLead);

// GET /api/leads/:id
router.get('/:id', leadController.getLead);

// PUT /api/leads/:id
router.put('/:id', validate(updateLeadSchema), leadController.updateLead);

// DELETE /api/leads/:id — admin and sales_manager only
router.delete('/:id', authorize('admin', 'sales_manager'), leadController.deleteLead);

// PATCH /api/leads/:id/status
router.patch('/:id/status', leadController.updateLeadStatus);

// PATCH /api/leads/:id/assign — admin and sales_manager only
router.patch(
  '/:id/assign',
  authorize('admin', 'sales_manager'),
  validate(assignLeadSchema),
  leadController.assignLead
);

// POST /api/leads/:id/convert — admin and sales_manager only
router.post(
  '/:id/convert',
  authorize('admin', 'sales_manager'),
  validate(convertLeadSchema),
  leadController.convertLead
);

module.exports = router;
