'use strict';

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const addressSchema = z.object({
  street:  z.string().optional(),
  city:    z.string().optional(),
  state:   z.string().optional(),
  country: z.string().optional(),
  zip:     z.string().optional(),
}).optional();

/** Schema for POST /api/customers */
const createCustomerSchema = z.object({
  name:         z.string().min(1, 'Customer name is required'),
  email:        z.string().email('Invalid email address').optional(),
  phone:        z.string().optional(),
  company:      z.string().optional(),
  address:      addressSchema,
  originalLead: z.string().regex(objectIdRegex, 'Invalid lead ID').optional(),
  assignedTo:   z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  status:       z.enum(['active', 'inactive']).optional(),
});

/** Schema for PUT /api/customers/:id — all fields optional, name cannot be cleared */
const updateCustomerSchema = z.object({
  name:       z.string().min(1, 'Customer name cannot be empty').optional(),
  email:      z.string().email('Invalid email address').optional(),
  phone:      z.string().optional(),
  company:    z.string().optional(),
  address:    addressSchema,
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  status:     z.enum(['active', 'inactive']).optional(),
  // originalLead is NOT updatable after creation — set during creation/conversion only
});

module.exports = { createCustomerSchema, updateCustomerSchema };
