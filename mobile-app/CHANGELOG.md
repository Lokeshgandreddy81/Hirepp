# Changelog

## [1.2.1] - 2026-01-10
### Added
- **Safety Screens**: Added `VerificationRequiredScreen.js` to prevent unverified users from accessing the app.
- **Forgot Password**: Added `ForgotPasswordScreen.js` with direct API integration.
- **Resilience**: Added `ResetPasswordScreen.js` for handling deep links (future proofing).

### Fixed
- **Login Stability**: fixed critical SyntaxError in `LoginScreen.js` that caused app crash on boot.
- **Navigation Logic**: Updated `LoginScreen.js` to correctly route unverified users to the verification wall.
- **Visual Sync**: Standardized new screens to use the "Purple/White" professional color palette.
