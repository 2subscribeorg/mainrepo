export const ENV = {
  DATA_BACKEND: (import.meta.env.VITE_DATA_BACKEND || 'MOCK') as 'MOCK' | 'FIREBASE',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
}
