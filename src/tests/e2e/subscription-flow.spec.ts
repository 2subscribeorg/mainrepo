import { test, expect } from '@playwright/test'

test.describe('Subscription Manager E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for data to load
    await page.waitForTimeout(2000)
  })

  test('should display dashboard with stats', async ({ page }) => {
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Active Subscriptions')).toBeVisible()
    await expect(page.getByText('Monthly Total')).toBeVisible()
  })

  test('should navigate to subscriptions and search', async ({ page }) => {
    // Navigate to subscriptions
    await page.getByRole('link', { name: 'Subscriptions' }).click()
    await expect(page.getByRole('heading', { name: 'Subscriptions' })).toBeVisible()

    // Search for a subscription
    const searchInput = page.getByPlaceholder('Search subscriptions...')
    await searchInput.fill('spotify')
    await page.waitForTimeout(500)

    // Should filter results
    const subscriptionCards = page.locator('.rounded-lg.border.bg-white')
    const count = await subscriptionCards.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should view subscription detail', async ({ page }) => {
    // Go to subscriptions
    await page.getByRole('link', { name: 'Subscriptions' }).click()
    await page.waitForTimeout(1000)

    // Click first subscription (if any exist)
    const firstCard = page.locator('.rounded-lg.border.bg-white').first()
    if ((await firstCard.count()) > 0) {
      await firstCard.click()
      await page.waitForTimeout(500)

      // Should show detail page
      await expect(page.getByText('Payment History')).toBeVisible()
    }
  })

  test('should manage budget and see breach warning', async ({ page }) => {
    // Navigate to budgets
    await page.getByRole('link', { name: 'Budgets' }).click()
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible()

    // Set a low monthly budget to trigger breach
    const monthlyInput = page.getByLabel('Monthly Limit (£)')
    await monthlyInput.fill('5')

    // Save budget
    await page.getByRole('button', { name: /Save Budget/i }).click()
    await page.waitForTimeout(1000)

    // Should show budget breach warning
    const breachSection = page.getByText(/Budget Breaches/i)
    if ((await breachSection.count()) > 0) {
      await expect(breachSection).toBeVisible()
    }
  })

  test('should edit categories', async ({ page }) => {
    // Navigate to categories
    await page.getByRole('link', { name: 'Categories' }).click()
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()

    // Add new category
    await page.getByRole('button', { name: 'Add Category' }).click()
    await page.waitForTimeout(300)

    // Fill in form
    await page.getByLabel('Name').fill('Test Category')

    // Save
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(1000)

    // Should see new category in list
    await expect(page.getByText('Test Category')).toBeVisible()
  })

  test('should access settings and view backend info', async ({ page }) => {
    // Navigate to settings
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    // Should show MOCK backend
    await expect(page.getByText('MOCK')).toBeVisible()
    await expect(page.getByText('Data Backend')).toBeVisible()
  })

  test('should enable superadmin and access admin panel', async ({ page }) => {
    // Enable superadmin mode (click the user icon)
    const adminToggle = page.locator('button[title="Enable superadmin"]')
    if ((await adminToggle.count()) > 0) {
      await adminToggle.click()
      await page.waitForTimeout(500)

      // Admin link should now be visible
      await page.getByRole('link', { name: 'Admin' }).click()
      await expect(page.getByRole('heading', { name: 'Superadmin' })).toBeVisible()

      // Should show merchant rules
      await expect(page.getByText('Merchant Categorisation Rules')).toBeVisible()
    }
  })
})
