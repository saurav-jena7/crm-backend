'use strict';

const express = require('express');
const router = express.Router();

const dealController = require('../controllers/deal.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createDealSchema, updateDealSchema, updateStageSchema } = require('../validators/deal.validators');

// All deal routes require authentication
router.use(authenticate);

// GET /api/deals
router.get('/', dealController.getAllDeals);

// POST /api/deals
router.post('/', validate(createDealSchema), dealController.createDeal);

// GET /api/deals/:id
router.get('/:id', dealController.getDeal);

// PUT /api/deals/:id
router.put('/:id', validate(updateDealSchema), dealController.updateDeal);

// DELETE /api/deals/:id — admin and sales_manager only
router.delete('/:id', authorize('admin', 'sales_manager'), dealController.deleteDeal);

// PATCH /api/deals/:id/stage
router.patch('/:id/stage', validate(updateStageSchema), dealController.updateDealStage);

module.exports = router;
