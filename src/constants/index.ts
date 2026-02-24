export const APP_NAME = 'C2C Customer Portal'
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export const QUERY_KEYS = {
  orders: ['orders'] as const,
  profile: ['profile'] as const,
  products: ['products'] as const,
} as const

export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  orders: '/orders',
} as const
