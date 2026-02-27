const express = require('express');
const router = express.Router();
const { createCheckoutSession, stripeWebhook, createFeaturedListingSession, subscribeApiTier } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/create-featured-listing', protect, createFeaturedListingSession);
router.post('/subscribe-api-tier', protect, subscribeApiTier);

// Note: Stripe Webhook specifically requires the raw body buffer, NOT parsed JSON!
// we handle this in index.js to use express.raw({type: 'application/json'})
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;
