const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_fake';
const stripe = require('stripe')(stripeKey);
const User = require('../models/userModel');
const Job = require('../models/Job');
const RevenueEvent = require('../models/RevenueEvent');
const { fireAndForget } = require('../services/revenueInstrumentationService');

// @desc Create a Checkout Session for Subscription or Credits
// @route POST /api/payment/create-checkout-session
// @access Private
const createCheckoutSession = async (req, res) => {
    try {
        const { planId, successUrl, cancelUrl } = req.body;

        let priceId;
        if (planId === 'pro') priceId = process.env.STRIPE_PRICE_PRO;
        // Map other plans here...

        if (!priceId) {
            return res.status(400).json({ message: "Invalid Plan ID" });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: req.user.email,
            client_reference_id: req.user._id.toString(),
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl || 'http://localhost:8081/success',
            cancel_url: cancelUrl || 'http://localhost:8081/cancel',
        });

        res.json({ sessionUrl: session.url });
    } catch (error) {
        console.error("Stripe Session Error:", error);
        res.status(500).json({ message: "Payment setup failed" });
    }
};

// @desc Stripe Webhook endpoint to receive asynchronous events
// @route POST /api/payment/webhook
// @access Public (Stripe only)
const stripeWebhook = async (req, res) => {
    const rawBody = req.body;
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.client_reference_id;

                await User.findByIdAndUpdate(userId, {
                    'subscription.plan': 'pro', // Based on logic
                    'subscription.stripeCustomerId': session.customer,
                    'subscription.stripeSubscriptionId': session.subscription
                });
                console.log(`✅ Subscription activated for User ${userId}`);
                if (session.mode === 'subscription') {
                    await User.findByIdAndUpdate(userId, {
                        'subscription.plan': 'pro', // Based on logic
                        'subscription.stripeCustomerId': session.customer,
                        'subscription.stripeSubscriptionId': session.subscription
                    });
                    console.log(`✅ Subscription activated for User ${userId}`);
                    fireAndForget('recordSubscriptionRevenueEvent', async () => {
                        const user = await User.findById(userId).select('acquisitionCity');
                        await RevenueEvent.create({
                            employerId: userId,
                            eventType: 'subscription_charge',
                            amountInr: 499,
                            currency: 'inr',
                            status: 'succeeded',
                            city: user?.acquisitionCity || 'Hyderabad',
                            stripeSessionId: session.id || null,
                            stripeSubscriptionId: session.subscription || null,
                            settledAt: new Date(),
                            metadata: {
                                source: 'stripe_webhook',
                            },
                        });
                    }, { userId: String(userId || '') });
                } else if (session.mode === 'payment') {
                    // Check if this was a featured listing purchase
                    if (session.metadata && session.metadata.type === 'featured_job') {
                        await Job.findByIdAndUpdate(session.metadata.jobId, { isFeatured: true });
                        console.log(`Job ${session.metadata.jobId} marked as featured.`);
                        fireAndForget('recordBoostRevenueEvent', async () => {
                            const job = await Job.findById(session.metadata.jobId).select('location');
                            await RevenueEvent.create({
                                employerId: userId,
                                eventType: 'boost_purchase',
                                amountInr: 499,
                                currency: 'inr',
                                status: 'succeeded',
                                city: job?.location || 'Hyderabad',
                                jobId: session.metadata.jobId,
                                stripeSessionId: session.id || null,
                                settledAt: new Date(),
                                metadata: {
                                    source: 'stripe_webhook',
                                },
                            });
                        }, { userId: String(userId || ''), jobId: String(session.metadata.jobId || '') });
                    }
                    // Award credits or manage logic downstream
                    const user = await User.findById(userId);
                    if (user) {
                        user.credits = (user.credits || 0) + 10; // Example: Award 10 credits for a one-time payment
                        await user.save();
                        console.log(`User ${userId} awarded 10 credits.`);
                    }
                }
                break;
            }
            case 'invoice.payment_failed': {
                const session = event.data.object;
                const user = await User.findOne({ 'subscription.stripeCustomerId': session.customer });
                if (user) {
                    user.subscription.plan = 'free';
                    await user.save();
                    console.log(`❌ Subscription downgraded for User ${user._id}`);
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        res.status(200).send();
    } catch (err) {
        console.error("Webhook processing error:", err);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

// @desc Create Checkout Session for a Featured Job Listing
// @route POST /api/payments/create-featured-listing
const createFeaturedListingSession = async (req, res) => {
    try {
        const { jobId } = req.body;
        // Verify job belongs to user here normally

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Featured Job Listing',
                            description: 'Highlight your job posting for 7 days.'
                        },
                        unit_amount: 19900, // $199.00
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
            customer: req.user.subscription.stripeCustomerId,
            metadata: {
                userId: req.user._id.toString(),
                type: 'featured_job',
                jobId: jobId
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error("Featured Listing Error:", error);
        res.status(500).json({ message: "Failed to create checkout session for featured listing." });
    }
};

// @desc Subscribe Partner to API Metered Billing Tier
// @route POST /api/payments/subscribe-api-tier
const subscribeApiTier = async (req, res) => {
    try {
        const { tierId } = req.body; // e.g. price_api_partner
        // Stub for API subscription logic
        res.json({ message: "API Enterprise Billing subscription initiated", url: "https://stripe.com/checkout/..." });
    } catch (error) {
        res.status(500).json({ message: "Failed logic" });
    }
}

module.exports = { createCheckoutSession, stripeWebhook, createFeaturedListingSession, subscribeApiTier };
