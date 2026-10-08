'use strict';

const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCustomerSchema, updateCustomerSchema } = require('../validators/customer.validators');

// All customer routes require authentication
router.use(authenticate);

// GET /api/customers
router.get('/', customerController.getAllCustomers);

// POST /api/customers
router.post('/', validate(createCustomerSchema), customerController.createCustomer);

// GET /api/customers/:id
router.get('/:id', customerController.getCustomer);

// PUT /api/customers/:id
router.put('/:id', validate(updateCustomerSchema), customerController.updateCustomer);

// DELETE /api/customers/:id — admin and sales_manager only
router.delete('/:id', authorize('admin', 'sales_manager'), customerController.deleteCustomer);

module.exports = router;
