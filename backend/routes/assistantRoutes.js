const express = require('express');
const { replyToVisitor } = require('../controllers/assistantController');

const router = express.Router();
router.post('/', replyToVisitor);

module.exports = router;
