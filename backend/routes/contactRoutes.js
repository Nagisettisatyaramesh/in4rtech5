const express = require('express');
const { createContact } = require('../controllers/contactController');
const { rateLimit } = require('../middleware/rateLimit');
const router = express.Router();
router.post('/', rateLimit('contact', 5, 60 * 60 * 1000), createContact);
module.exports = router;
