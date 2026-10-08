'use strict';

const express = require('express');
const router = express.Router();

const configController = require('../controllers/config.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All config routes — admin only
router.use(authenticate, authorize('admin'));

// GET /api/config
router.get('/', configController.getAllConfig);

// GET /api/config/:key
router.get('/:key', configController.getConfig);

// POST /api/config — create or update
router.post('/', configController.setConfig);

// DELETE /api/config/:key
router.delete('/:key', configController.deleteConfig);

module.exports = router;
