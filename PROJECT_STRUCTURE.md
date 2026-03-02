# PROJECT STRUCTURE

## Backend Architecture
```
backend/
├── config/        # Environment and DB connection setups
├── controllers/   # Route handlers / thin logic wrappers
├── middleware/    # Auth, validation, rate limits
├── models/        # Mongoose schema definitions
├── reports/       # Audit and metric JSON logs
├── routes/        # Express router setups
├── scripts/       # CLI operations, load tests, cron triggers
├── services/      # Heavy business logic (additive, zero-trust)
├── tests/         # Jest regression and unit suites
├── utils/         # Helper functions
└── workers/       # Background SQS tasks
```

## Mobile Architecture
```
mobile-app/
├── assets/        # Static images, icons, fonts
└── src/
    ├── components/# Reusable UI elements
    ├── hooks/     # Custom React Native hooks
    ├── navigation/# Stack & Tab routing
    ├── screens/   # Primary view components
    ├── services/  # API and edge logic
    ├── theme/     # Colors, spacing, typography
    └── utils/     # Helpers
```
