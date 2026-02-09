export const brandTheme = {
  colors: {
    // Base colors
    background: '#F9FAFB',
    surface: '#FFFFFF',
    primary: '#5D3FD3',
    success: '#00D084',
    danger: '#FC4C4C',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    
    // Status colors - Success
    successBg: '#ECFDF5',
    successBgHover: '#D1FAE5',
    successBorder: '#A7F3D0',
    successText: '#065F46',
    successTextEmphasis: '#047857',
    
    // Status colors - Warning
    warningBg: '#FFFBEB',
    warningBgHover: '#FEF3C7',
    warningBorder: '#FDE68A',
    warningText: '#92400E',
    warningTextEmphasis: '#B45309',
    
    // Status colors - Error
    errorBg: '#FEF2F2',
    errorBgHover: '#FEE2E2',
    errorBorder: '#FECACA',
    errorText: '#991B1B',
    errorTextEmphasis: '#DC2626',
    
    // Status colors - Info
    infoBg: '#EFF6FF',
    infoBgHover: '#DBEAFE',
    infoBorder: '#BFDBFE',
    infoText: '#1E40AF',
    infoTextEmphasis: '#2563EB',
    
    // Surface variations
    surfaceElevated: '#FAFAFA',
    surfaceOverlay: 'rgba(255, 255, 255, 0.8)',
    surfaceOverlayDark: 'rgba(255, 255, 255, 0.95)',
    surfaceBackdrop: 'rgba(0, 0, 0, 0.5)',
    surfaceBackdropLight: 'rgba(0, 0, 0, 0.3)',
    
    // Text variations
    textMuted: '#9CA3AF',
    textDisabled: '#D1D5DB',
    textInverse: '#FFFFFF',
    textLink: '#5D3FD3',
    textLinkHover: '#4A2FB0',
    
    // Border variations
    borderLight: 'rgba(15, 23, 42, 0.08)',
    borderMedium: 'rgba(15, 23, 42, 0.12)',
    borderStrong: 'rgba(15, 23, 42, 0.24)',
    borderFocus: '#5D3FD3',
    
    // Interactive states
    interactiveHover: 'rgba(93, 63, 211, 0.08)',
    interactiveActive: 'rgba(93, 63, 211, 0.16)',
    interactiveDisabled: '#F3F4F6',
  },
} as const

const cssVarMap = {
  // Base colors
  background: '--color-background',
  surface: '--color-surface',
  primary: '--color-primary',
  success: '--color-success',
  danger: '--color-danger',
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  
  // Status colors - Success
  successBg: '--color-success-bg',
  successBgHover: '--color-success-bg-hover',
  successBorder: '--color-success-border',
  successText: '--color-success-text',
  successTextEmphasis: '--color-success-text-emphasis',
  
  // Status colors - Warning
  warningBg: '--color-warning-bg',
  warningBgHover: '--color-warning-bg-hover',
  warningBorder: '--color-warning-border',
  warningText: '--color-warning-text',
  warningTextEmphasis: '--color-warning-text-emphasis',
  
  // Status colors - Error
  errorBg: '--color-error-bg',
  errorBgHover: '--color-error-bg-hover',
  errorBorder: '--color-error-border',
  errorText: '--color-error-text',
  errorTextEmphasis: '--color-error-text-emphasis',
  
  // Status colors - Info
  infoBg: '--color-info-bg',
  infoBgHover: '--color-info-bg-hover',
  infoBorder: '--color-info-border',
  infoText: '--color-info-text',
  infoTextEmphasis: '--color-info-text-emphasis',
  
  // Surface variations
  surfaceElevated: '--color-surface-elevated',
  surfaceOverlay: '--color-surface-overlay',
  surfaceOverlayDark: '--color-surface-overlay-dark',
  surfaceBackdrop: '--color-surface-backdrop',
  surfaceBackdropLight: '--color-surface-backdrop-light',
  
  // Text variations
  textMuted: '--color-text-muted',
  textDisabled: '--color-text-disabled',
  textInverse: '--color-text-inverse',
  textLink: '--color-text-link',
  textLinkHover: '--color-text-link-hover',
  
  // Border variations
  borderLight: '--color-border-light',
  borderMedium: '--color-border-medium',
  borderStrong: '--color-border-strong',
  borderFocus: '--color-border-focus',
  
  // Interactive states
  interactiveHover: '--color-interactive-hover',
  interactiveActive: '--color-interactive-active',
  interactiveDisabled: '--color-interactive-disabled',
} as const

export type BrandColorToken = keyof typeof cssVarMap

/**
 * Merges optional overrides with the default palette and writes them
 * into CSS custom properties so the entire UI updates automatically.
 *
 * Call this once on app bootstrap if you want to swap palettes at runtime.
 */
export function applyBrandTheme(overrides: Partial<Record<BrandColorToken, string>> = {}) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  const palette = { ...brandTheme.colors, ...overrides }

  ;(Object.keys(cssVarMap) as BrandColorToken[]).forEach((token) => {
    const cssVarName = cssVarMap[token]
    root.style.setProperty(cssVarName, palette[token])
  })
}

/**
 * Utility that exposes the raw CSS variable names.
 * Helpful when building gradients or custom styles in JS/TS.
 */
export const brandCssVars = cssVarMap
