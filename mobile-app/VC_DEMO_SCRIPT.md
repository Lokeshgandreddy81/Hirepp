# VC Demo Script Lock (DEMO_MODE)

## Preconditions (30 sec)
- `EXPO_PUBLIC_DEMO_MODE=true`
- Start app fresh (`npx expo start --clear`)
- For full onboarding walkthrough, clear session once (logout or clear `userInfo` in SecureStore)

## Primary Flow (5 min)

### 1) App Open (0:00 - 0:20)
- Launch app.
- Expect: branded splash, no runtime spinner loops, immediate route resolution.
- Event: `APP_OPEN`.

### 2) Role Selection (0:20 - 0:45)
- Select Supply or Demand role.
- Expect: transition to auth/onboarding path without empty states.
- Event: `ROLE_SELECTED`.

### 3) Profile View (0:45 - 1:15)
- Open Profile tab.
- Expect: populated profile cards, no loading skeleton in DEMO_MODE.
- Event: `PROFILE_VIEWED`.

### 4) Browse Jobs (1:15 - 2:00)
- Open Jobs tab, open one job detail.
- Expect: instant list render from mock API.
- Event: `JOB_VIEWED`.

### 5) Apply to Job (2:00 - 2:25)
- Apply from job detail/card.
- Expect: application created and accepted in demo flow for immediate chat path.
- Event: `JOB_APPLIED`.

### 6) Employer-Side Proof (2:25 - 3:00)
- Switch mode from Settings to Demand.
- Open Applications/My Posts to show incoming pipeline state.
- Event: `ROLE_SELECTED` + `TAB_SWITCH`.

### 7) Chat Started (3:00 - 3:45)
- Open accepted application chat.
- Send first message.
- Expect: no flicker, instant thread load.
- Event: `CHAT_STARTED`.

### 8) Video Call Initiated (3:45 - 4:20)
- Tap video icon from chat header.
- Expect: call shell opens, duration timer starts, no blank screen.
- Event: `VIDEO_CALL_STARTED`.

### 9) Connect Social Proof (4:20 - 4:50)
- Open Connect tab.
- Show Feed and Circles quickly.
- Expect: dense mock content, smooth tab switching.
- Event: `TAB_SWITCH`.

### 10) Analytics Evidence (4:50 - 5:00)
- Read console snapshot from `[demo-metrics]` output.
- Shows dataset totals + event counts.

## Compressed Fallback Flow (2 min)
- App open -> Jobs -> Chat (existing accepted app) -> Video call -> Connect Feed/Circles -> console demo metrics.
- Skip detailed apply/employer transitions.

## Demo Guardrails
- No dependency on live network APIs in DEMO_MODE.
- No socket dependency in DEMO_MODE.
- Keep transitions linear: avoid opening stacked modals before closing previous modal.
