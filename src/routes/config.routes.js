'use strict';

const express = require('express');
const router = express.Router();

const configController = require('../controllers/config.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/', configController.getAllConfig);
router.get('/:key', configController.getConfig);
router.post('/', configController.setConfig);
router.delete('/:key', configController.deleteConfig);

module.exports = router;
