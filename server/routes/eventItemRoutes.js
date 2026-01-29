const express = require('express');
const router = express.Router();
const { getEventItems } = require('../controllers/eventItemController');

router.route('/').get(getEventItems);

module.exports = router;
