/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Color tokens mapped to Tailwind utilities
      colors: {
        // Base colors
        primary: 'var(--color-primary)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        error: '#DC2626',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        
        // Status colors
        'success-bg': 'var(--color-success-bg)',
        'success-bg-hover': 'var(--color-success-bg-hover)',
        'success-border': 'var(--color-success-border)',
        'success-text': 'var(--color-success-text)',
        
        'warning-bg': 'var(--color-warning-bg)',
        'warning-bg-hover': 'var(--color-warning-bg-hover)',
        'warning-border': 'var(--color-warning-border)',
        'warning-text': 'var(--color-warning-text)',
        
        'error-bg': 'var(--color-error-bg)',
        'error-bg-hover': 'var(--color-error-bg-hover)',
        'error-border': 'var(--color-error-border)',
        'error-text': 'var(--color-error-text)',
        
        'info-bg': 'var(--color-info-bg)',
        'info-bg-hover': 'var(--color-info-bg-hover)',
        'info-border': 'var(--color-info-border)',
        'info-text': 'var(--color-info-text)',
        
        // Surface variations
        'surface-elevated': 'var(--color-surface-elevated)',
        'surface-overlay': 'var(--color-surface-overlay)',
        'surface-backdrop': 'var(--color-surface-backdrop)',
        
        // Text variations
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-disabled': 'var(--color-text-disabled)',
        'text-inverse': 'var(--color-text-inverse)',
        
        // Border variations
        'border-light': 'var(--color-border-light)',
        'border-medium': 'var(--color-border-medium)',
        'border-strong': 'var(--color-border-strong)',
        'border-focus': 'var(--color-border-focus)',
        
        // Interactive states
        'interactive-hover': 'var(--color-interactive-hover)',
        'interactive-active': 'var(--color-interactive-active)',
        'interactive-disabled': 'var(--color-interactive-disabled)',
      },
      
      // Spacing tokens
      spacing: {
        'touch-min': 'var(--touch-target-min)',
        'touch-comfortable': 'var(--touch-target-comfortable)',
        'touch-large': 'var(--touch-target-large)',
      },
      
      // Border radius tokens
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)',
      },
      
      // Font size tokens
      fontSize: {
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
      },
      
      // Font weight tokens
      fontWeight: {
        'normal': 'var(--font-weight-normal)',
        'medium': 'var(--font-weight-medium)',
        'semibold': 'var(--font-weight-semibold)',
        'bold': 'var(--font-weight-bold)',
      },
      
      // Line height tokens
      lineHeight: {
        'tight': 'var(--line-height-tight)',
        'normal': 'var(--line-height-normal)',
        'relaxed': 'var(--line-height-relaxed)',
      },
      
      // Box shadow tokens
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
      },
      
      // Transition duration tokens
      transitionDuration: {
        'instant': 'var(--duration-instant)',
        'fast': 'var(--duration-fast)',
        'base': 'var(--duration-base)',
        'slow': 'var(--duration-slow)',
        'slower': 'var(--duration-slower)',
      },
      
      // Z-index tokens
      zIndex: {
        'base': 'var(--z-base)',
        'dropdown': 'var(--z-dropdown)',
        'sticky': 'var(--z-sticky)',
        'fixed': 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'toast': 'var(--z-toast)',
        'tooltip': 'var(--z-tooltip)',
        'maximum': 'var(--z-maximum)',
      },
    },
  },
  plugins: [],
}
