const ENV = process.env.APP_ENV || 'development';

const configs = {
    development: {
        API_URL: 'http://localhost:3000',
    },
    preview: {
        API_URL: 'https://your-staging-server.com',
    },
    production: {
        API_URL: 'https://api.hirecircle.in',
    },
};

const selectedConfig = configs[ENV] || configs.development;

const resolvedApiUrl = process.env.EXPO_PUBLIC_API_URL || selectedConfig.API_URL;
const rawDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE ?? process.env.DEMO_MODE ?? 'false';
const demoModeValue = String(rawDemoMode).trim().toLowerCase();
export const DEMO_MODE = demoModeValue === 'true' || demoModeValue === '1' || demoModeValue === 'yes' || demoModeValue === 'on';
const rawMatchUiV1 = process.env.EXPO_PUBLIC_FEATURE_MATCH_UI_V1 ?? 'true';
const matchUiFlagValue = String(rawMatchUiV1).trim().toLowerCase();
export const FEATURE_MATCH_UI_V1 = matchUiFlagValue === 'true' || matchUiFlagValue === '1' || matchUiFlagValue === 'yes' || matchUiFlagValue === 'on';
const rawSettingsAdvanced = process.env.EXPO_PUBLIC_FEATURE_SETTINGS_ADVANCED ?? 'false';
const settingsAdvancedFlagValue = String(rawSettingsAdvanced).trim().toLowerCase();
export const FEATURE_SETTINGS_ADVANCED = settingsAdvancedFlagValue === 'true' || settingsAdvancedFlagValue === '1' || settingsAdvancedFlagValue === 'yes' || settingsAdvancedFlagValue === 'on';

const isHttpsUrl = (value = '') => /^https:\/\//i.test(value);
const isTrustedLocalHttpUrl = (value = '') => (
    /^http:\/\/((localhost|127\.0\.0\.1|10\.0\.2\.2)|(192\.168\.\d+\.\d+)|(10\.\d+\.\d+\.\d+)|(172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+))(:\d+)?(\/|$)/i.test(value)
);

const getSafeApiUrl = (candidateUrl) => {
    if (isHttpsUrl(candidateUrl) || isTrustedLocalHttpUrl(candidateUrl)) {
        return candidateUrl;
    }
    if (ENV === 'production') {
        return configs.production.API_URL;
    }
    return selectedConfig.API_URL;
};

export const API_URL = getSafeApiUrl(resolvedApiUrl);
export const BASE_URL = API_URL;
export const SOCKET_URL = API_URL;
