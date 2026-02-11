/**
 * Senior UX Note: 
 * These colours are selected for maximum contrast across all 3 types of colour blindness.
 * They also maintain distinct 'Grey' values for monochromatic users.
 */
export const DEFAULT_COLORS = [
  '#0072B2', // Deep Blue (Safe Primary)
  '#D55E00', // Vermillion (High visibility)
  '#009E73', // Bluish Green (Growth/Wellness)
  '#F0E442', // Yellow (High contrast)
  '#CC79A7', // Reddish Purple (Entertainment)
  '#56B4E9', // Sky Blue (Utilities)
  '#E69F00', // Orange (Shopping)
  '#000000', // Black (Strict Neutral)
  '#8E44AD', // Deep Purple (Legacy choice)
  '#2C3E50', // Midnight (Bills)
  '#BDC3C7', // Silver (Inactive/Other)
  '#16A085', // Teal (Education)
];

export function getRandomColor(): string {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
}

export function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = ((num >> 8) & 0x00ff) + amt
  const B = (num & 0x0000ff) + amt
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  )
}
