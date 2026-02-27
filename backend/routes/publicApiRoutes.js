const express = require('express');
const router = express.Router();
const { protectApiKey, getPublicJobsList, registerWebhook } = require('../controllers/publicApiController');

router.use(protectApiKey);

router.get('/jobs', getPublicJobsList);
router.post('/webhooks', registerWebhook);

module.exports = router;
