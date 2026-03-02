# Profile Gating Enforcement Certification

## Objective
Ensure users cannot access the main app without a completed profile and a verified OTP, applying to both workers and employers (including role switching scenarios).

## Target Validation Matrix
| Requirement | Status | Enforced via | Evaluated Path |
| :--- | :--- | :--- | :--- |
| **OTP Verified** | ✅ PASS | `authMiddleware.js` | 403 `OTP_NOT_VERIFIED` |
| **Profile Completed (Base)** | ✅ PASS | `authMiddleware.js` | 403 `PROFILE_INCOMPLETE` |
| **Role Profile Completed** | ✅ PASS | `authMiddleware.js` | 403 `PROFILE_INCOMPLETE_ROLE` |
| **Setup Route Exemption** | ✅ PASS | `authMiddleware.js` | `exemptPaths` |

## Execution Summary
Core security checks for the `generateToken` ecosystem are strictly enforced at the middleware layer (`authMiddleware.js`). Only `/auth/*`, `/profile/setup`, `/profile/complete`, and public API routes bypass these constraints.

### Test Coverage (`tests/strictProfileGating.test.js`)
1. Rejects request with `403 OTP_NOT_VERIFIED` if OTP not verified.
2. Rejects request with `403 PROFILE_INCOMPLETE` if base profile incomplete.
3. Exempts setup routes, allowing profile completion (`/api/users/profile/complete`).
4. Rejects Employer-specific routes if EmployerProfile doesn't exist during role switch (`403 PROFILE_INCOMPLETE_ROLE`).
5. Allows access if OTP is verified, Profile is Complete, and `workerProfile.roleProfiles.length > 0` (for workers) or `EmployerProfile` exists (for employers).

### Verification
- Regressions in `authorizationEscalation`, `injectionAndXss`, and `authPenetrationAttack` were resolved by ensuring mock active users bypass gating controls.
- Route `/api/users/profile/complete` sets database values enabling the user upon success.
- Handled backwards compatibility for tokens generated dynamically during `POST /verify`.
