'use strict';

const { z } = require('zod');
const { objectIdRegex, phoneSchema } = require('./common.validators');

const addressSchema = z.object({
  street:  z.string().optional(),
  city:    z.string().optional(),
  state:   z.string().optional(),
  country: z.string().optional(),
  zip:     z.string().optional(),
}).optional();

const createCustomerSchema = z.object({
  name:         z.string().min(1, 'Customer name is required'),
  email:        z.string().email('Invalid email address').optional(),
  phone:        phoneSchema,
  company:      z.string().optional(),
  address:      addressSchema,
  originalLead: z.string().regex(objectIdRegex, 'Invalid lead ID').optional(),
  assignedTo:   z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  status:       z.enum(['active', 'inactive']).optional(),
});

const updateCustomerSchema = z.object({
  name:       z.string().min(1, 'Customer name cannot be empty').optional(),
  email:      z.string().email('Invalid email address').optional(),
  phone:      phoneSchema,
  company:    z.string().optional(),
  address:    addressSchema,
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  status:     z.enum(['active', 'inactive']).optional(),
  // originalLead intentionally excluded — immutable after creation
});

module.exports = { createCustomerSchema, updateCustomerSchema };
