export const getPrimaryRoleFromUser = (userInfo = {}) => {
    const explicitPrimary = String(userInfo?.primaryRole || '').toLowerCase();
    if (explicitPrimary === 'employer' || explicitPrimary === 'worker') {
        return explicitPrimary;
    }

    const legacyRole = String(userInfo?.role || '').toLowerCase();
    if (legacyRole === 'employer' || legacyRole === 'recruiter' || legacyRole === 'admin') {
        return 'employer';
    }
    return 'worker';
};

export const isDemandMode = (userInfo = {}) => getPrimaryRoleFromUser(userInfo) === 'employer';

export const getModeCopy = (primaryRole) => {
    if (primaryRole === 'employer') {
        return {
            modeLabel: 'I Need Someone (Demand)',
            switchLabel: 'Switch to: Helping Others (Supply)',
            switchedMessage: 'You are now in Supply mode. Offer help to people nearby.',
        };
    }

    return {
        modeLabel: 'Helping Others (Supply)',
        switchLabel: 'Switch to: I Need Someone (Demand)',
        switchedMessage: 'You are now in Demand mode. Post what you need.',
    };
};

export const getLegacyRoleForPrimaryRole = (primaryRole) => (
    primaryRole === 'employer' ? 'recruiter' : 'candidate'
);
