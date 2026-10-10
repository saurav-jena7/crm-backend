'use strict';

const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCustomerSchema, updateCustomerSchema } = require('../validators/customer.validators');

router.use(authenticate);

router.get('/', customerController.getAllCustomers);
router.post('/', validate(createCustomerSchema), customerController.createCustomer);
router.get('/:id', customerController.getCustomer);
router.put('/:id', validate(updateCustomerSchema), customerController.updateCustomer);
router.delete('/:id', authorize('admin', 'sales_manager'), customerController.deleteCustomer);

module.exports = router;
