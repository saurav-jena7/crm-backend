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

router.use(authenticate);

router.get('/', leadController.getAllLeads);
router.post('/', validate(createLeadSchema), leadController.createLead);
router.get('/:id', leadController.getLead);
router.put('/:id', validate(updateLeadSchema), leadController.updateLead);
router.delete('/:id', authorize('admin'), leadController.deleteLead);
router.patch('/:id/status', validate(updateLeadStatusSchema), leadController.updateLeadStatus);
router.patch('/:id/assign', authorize('admin', 'sales_manager'), validate(assignLeadSchema), leadController.assignLead);
router.post('/:id/convert', validate(convertLeadSchema), leadController.convertLead);

module.exports = router;
