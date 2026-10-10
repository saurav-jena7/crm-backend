'use strict';

const express = require('express');
const router = express.Router();

const dealController = require('../controllers/deal.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createDealSchema, updateDealSchema, updateStageSchema } = require('../validators/deal.validators');

router.use(authenticate);

router.get('/', dealController.getAllDeals);
router.post('/', validate(createDealSchema), dealController.createDeal);
router.get('/:id', dealController.getDeal);
router.put('/:id', validate(updateDealSchema), dealController.updateDeal);
router.delete('/:id', authorize('admin', 'sales_manager'), dealController.deleteDeal);
router.patch('/:id/stage', validate(updateStageSchema), dealController.updateDealStage);

module.exports = router;
