# Testing Guide

## Test Structure

```
src/tests/
├── setup.ts                    # Test environment setup (fake-indexeddb)
├── unit/                       # Vitest unit tests
│   ├── BudgetService.test.ts
│   ├── CategorisationService.test.ts
│   └── formatters.test.ts
└── e2e/                        # Playwright E2E tests
    └── subscription-flow.spec.ts
```

## Running Tests

### Unit Tests (Vitest)
```bash
# Run once
npm test

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage
```

### E2E Tests (Playwright)
```bash
# Headless mode
npm run test:e2e

# UI mode (interactive)
npm run test:e2e -- --ui

# Debug mode
npm run test:e2e -- --debug
```

## Test Coverage

### Unit Tests (17 tests)
- ✅ **BudgetService** (5 tests)
  - Monthly spending calculation
  - Budget breach detection
  - Category budget tracking
  - Predictive overage checks
  - Edge case handling (±£0.01)

- ✅ **CategorisationService** (5 tests)
  - Transaction-specific overrides
  - Merchant rule matching
  - Priority-based rule selection
  - Fallback to uncategorised
  - Category override persistence

- ✅ **Formatters** (7 tests)
  - Money formatting (GBP, EUR, USD)
  - Date formatting
  - Relative date formatting

### E2E Tests (7 scenarios)
- Dashboard display
- Subscription search & filter
- Subscription detail view
- Budget management & breach warnings
- Category CRUD operations
- Settings & backend configuration
- Superadmin access & merchant rules

## Test Environment

### Vitest Configuration
- **Environment:** jsdom (browser-like)
- **Globals:** true (describe, it, expect available)
- **Setup:** fake-indexeddb for IndexedDB support
- **Excludes:** E2E tests, node_modules

### Playwright Configuration
- **Browser:** Chromium
- **Base URL:** http://localhost:5173
- **Test Directory:** src/tests/e2e
- **Retries:** 2 (in CI), 0 (local)

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { clearDB, getDB } from '@/data/repo/mock/db'

describe('MyService', () => {
  beforeEach(async () => {
    await clearDB() // Clean database before each test
  })

  it('should do something', async () => {
    const db = await getDB()
    // Your test code
    expect(result).toBe(expected)
  })
})
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test'

test('should perform action', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Click me' }).click()
  await expect(page.getByText('Success')).toBeVisible()
})
```

## CI/CD Integration

Tests run automatically in GitHub Actions:
1. **Lint & Type Check** → 2. **Unit Tests** → 3. **E2E Tests** → 4. **Build**

All steps must pass before deployment.

## Troubleshooting

### "indexedDB is not defined"
- Ensure `fake-indexeddb` is installed
- Check `src/tests/setup.ts` is configured in `vitest.config.ts`

### Playwright tests fail
- Install browsers: `npx playwright install --with-deps`
- Check dev server is running on port 5173

### Tests timeout
- Increase timeout in test config
- Check for infinite loops or unresolved promises
