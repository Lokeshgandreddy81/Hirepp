const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
    getSettings,
    updateSettings,
    updateNotificationPreferences,
    updatePrivacyPreferences,
    updateSecuritySettings,
    requestDataDownload,
    deleteAccount,
    getBillingOverview,
    getInvoices,
} = require('../controllers/settingsController');

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);
router.post('/notification-preferences', protect, updateNotificationPreferences);
router.post('/privacy', protect, updatePrivacyPreferences);
router.post('/security', protect, updateSecuritySettings);
router.post('/data-download', protect, requestDataDownload);
router.delete('/account', protect, deleteAccount);
router.get('/billing-overview', protect, getBillingOverview);
router.get('/invoices', protect, getInvoices);

module.exports = router;
