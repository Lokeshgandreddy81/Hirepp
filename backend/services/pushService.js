const axios = require('axios');

const sendPushNotification = async (pushTokens, title, body, data = {}) => {
    const messages = (pushTokens || [])
        .filter(token => typeof token === 'string' && token.startsWith('ExponentPushToken'))
        .map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data,
            priority: 'high',
        }));

    if (messages.length === 0) return;

    try {
        await axios.post('https://exp.host/--/api/v2/push/send', messages, {
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });
    } catch (err) {
        console.error('Push notification failed:', err.message);
        // Non-blocking — never throw, just log
    }
};

module.exports = { sendPushNotification };
