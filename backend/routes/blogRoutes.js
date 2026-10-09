const express = require('express');
const { listPublished, getPublished } = require('../controllers/blogController');

const router = express.Router();
router.get('/', listPublished);
router.get('/:slug', getPublished);

module.exports = router;
