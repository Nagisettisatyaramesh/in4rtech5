// Vercel detects and deploys this exported Express app as a serverless function.
require('express');
module.exports = require('./backend/app');
