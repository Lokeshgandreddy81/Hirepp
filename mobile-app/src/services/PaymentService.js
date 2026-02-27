import client from '../api/client';

export const createPaymentIntent = async ({ plan, amount }) => {
    // TODO: wire Stripe when installed
    return client.post('/api/payments/create-intent', { plan, amount });
};
