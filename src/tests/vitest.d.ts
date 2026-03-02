/// <reference types="vitest" />

import type { VueWrapper } from '@vue/test-utils'

declare global {
  namespace Vi {
    interface JestAssertion<T = any> extends jest.Matchers<void, T> {
      toBeInTheDocument(): T
      toHaveClass(className: string): T
      toHaveAttribute(attr: string, value?: string): T
      toHaveStyle(style: Record<string, string>): T
      toBeVisible(): T
      toBeDisabled(): T
      toBeChecked(): T
    }
  }
}

export {}
