/**
 * Category Icons Library
 * Curated set of icons for subscription categories
 * Using Lucide icon names (already available in the project)
 */
import {
  Film, Tv, Music, Gamepad2, Book, Radio, PlayCircle, Headphones,
  ShoppingCart, ShoppingBag, Package, Gift, CreditCard, Tag, Store,
  Utensils, Coffee, Pizza, Wine, Beer, IceCream, Apple,
  Home, Lightbulb, Droplet, Flame, Wifi, Phone, Shield, Wrench,
  Car, Train, Plane, Bike, MapPin, Compass,
  Heart, Activity, Pill, Stethoscope, Dumbbell, Footprints,
  GraduationCap, BookOpen, Brain, Calculator, Laptop, PenTool,
  Briefcase, Building, Users, ChartBar, Calendar, Clock, Mail,
  User, Scissors, Camera, Smartphone, Glasses,
  PiggyBank, Receipt, Banknote, TrendingUp, TrendingDown,
  Star, Zap, Cloud, Globe, Anchor, Flag, MoreHorizontal
} from 'lucide-vue-next'

export const CATEGORY_ICONS = [
  // Entertainment & Media
  'film',
  'tv', 
  'music',
  'gamepad-2',
  'book',
  'radio',
  'play-circle',
  'headphones',
  
  // Shopping & Retail
  'shopping-cart',
  'shopping-bag',
  'package',
  'gift',
  'credit-card',
  'tag',
  'store',
  
  // Food & Dining
  'utensils',
  'coffee',
  'pizza',
  'wine',
  'beer',
  'ice-cream',
  'apple',
  
  // Home & Utilities
  'home',
  'lightbulb',
  'droplet',
  'flame',
  'wifi',
  'phone',
  'shield',
  'wrench',
  
  // Transportation
  'car',
  'train',
  'plane',
  'bicycle',
  'map-pin',
  'compass',
  
  // Health & Fitness
  'heart',
  'activity',
  'pill',
  'stethoscope',
  'dumbbell',
  'footprints',
  
  // Education & Learning
  'graduation-cap',
  'book-open',
  'brain',
  'calculator',
  'laptop',
  'pen-tool',
  
  // Business & Work
  'briefcase',
  'building',
  'users',
  'chart-bar',
  'calendar',
  'clock',
  'mail',
  
  // Personal & Lifestyle
  'user',
  'scissors',
  'camera',
  'smartphone',
  'glasses',
  
  // Finance & Banking
  'piggy-bank',
  'receipt',
  'banknote',
  'trending-up',
  'trending-down',
  'calculator',
  
  // Miscellaneous
  'star',
  'zap',
  'cloud',
  'globe',
  'anchor',
  'flag',
  'more-horizontal'
]

/**
 * Get a random icon from the category icons library
 */
export function getRandomCategoryIcon(): string {
  return CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)]
}

/**
 * Get default icon for common category names
 */
export function getDefaultIconForCategory(categoryName: string): string {
  const name = categoryName.toLowerCase()
  
  // Entertainment
  if (name.includes('netflix') || name.includes('streaming') || name.includes('tv') || name.includes('film')) return 'tv'
  if (name.includes('music') || name.includes('spotify') || name.includes('audio')) return 'music'
  if (name.includes('game') || name.includes('gaming') || name.includes('playstation') || name.includes('xbox')) return 'gamepad-2'
  
  // Shopping
  if (name.includes('amazon') || name.includes('shopping') || name.includes('store')) return 'shopping-cart'
  if (name.includes('clothing') || name.includes('fashion')) return 'shopping-bag'
  
  // Food
  if (name.includes('food') || name.includes('restaurant') || name.includes('dining')) return 'utensils'
  if (name.includes('coffee') || name.includes('starbucks')) return 'coffee'
  
  // Utilities
  if (name.includes('electric') || name.includes('power') || name.includes('light')) return 'lightbulb'
  if (name.includes('water') || name.includes('bill')) return 'droplet'
  if (name.includes('internet') || name.includes('wifi')) return 'wifi'
  if (name.includes('phone') || name.includes('mobile')) return 'phone'
  
  // Transportation
  if (name.includes('gas') || name.includes('fuel') || name.includes('petrol')) return 'gas-pump'
  if (name.includes('car') || name.includes('auto') || name.includes('uber')) return 'car'
  if (name.includes('transport') || name.includes('transit')) return 'train'
  
  // Health
  if (name.includes('gym') || name.includes('fitness') || name.includes('workout')) return 'dumbbell'
  if (name.includes('health') || name.includes('medical') || name.includes('doctor')) return 'heart'
  
  // Education
  if (name.includes('education') || name.includes('learning') || name.includes('course')) return 'graduation-cap'
  if (name.includes('book') || name.includes('reading')) return 'book'
  
  // Finance
  if (name.includes('bank') || name.includes('banking') || name.includes('finance')) return 'building'
  if (name.includes('insurance') || name.includes('protection')) return 'shield'
  
  // Default
  return 'tag'
}

/**
 * Icon categories for better organization in UI
 */
export const ICON_CATEGORIES = {
  entertainment: ['film', 'tv', 'music', 'gamepad-2', 'book', 'radio', 'play-circle', 'headphones'],
  shopping: ['shopping-cart', 'shopping-bag', 'package', 'gift', 'credit-card', 'tag', 'store'],
  food: ['utensils', 'coffee', 'pizza', 'wine', 'beer', 'ice-cream', 'apple'],
  home: ['home', 'lightbulb', 'droplet', 'flame', 'wifi', 'phone', 'shield', 'wrench'],
  transport: ['car', 'train', 'plane', 'bicycle', 'map-pin', 'compass'],
  health: ['heart', 'activity', 'pill', 'stethoscope', 'dumbbell', 'footprints'],
  education: ['graduation-cap', 'book-open', 'brain', 'calculator', 'laptop', 'pen-tool'],
  business: ['briefcase', 'building', 'users', 'chart-bar', 'calendar', 'clock', 'mail'],
  personal: ['user', 'scissors', 'camera', 'smartphone', 'glasses'],
  finance: ['piggy-bank', 'receipt', 'banknote', 'trending-up', 'trending-down'],
  misc: ['star', 'zap', 'cloud', 'globe', 'anchor', 'flag', 'more-horizontal']
} as const

/**
 * Get the Lucide Vue component for a given icon name.
 * Used for rendering icons dynamically (e.g. inside the donut chart).
 */
const iconComponentMap: Record<string, any> = {
  'film': Film, 'tv': Tv, 'music': Music, 'gamepad-2': Gamepad2,
  'book': Book, 'radio': Radio, 'play-circle': PlayCircle, 'headphones': Headphones,
  'shopping-cart': ShoppingCart, 'shopping-bag': ShoppingBag, 'package': Package,
  'gift': Gift, 'credit-card': CreditCard, 'tag': Tag, 'store': Store,
  'utensils': Utensils, 'coffee': Coffee, 'pizza': Pizza, 'wine': Wine,
  'beer': Beer, 'ice-cream': IceCream, 'apple': Apple,
  'home': Home, 'lightbulb': Lightbulb, 'droplet': Droplet, 'flame': Flame,
  'wifi': Wifi, 'phone': Phone, 'shield': Shield, 'wrench': Wrench,
  'car': Car, 'train': Train, 'plane': Plane, 'bicycle': Bike,
  'map-pin': MapPin, 'compass': Compass,
  'heart': Heart, 'activity': Activity, 'pill': Pill, 'stethoscope': Stethoscope,
  'dumbbell': Dumbbell, 'footprints': Footprints,
  'graduation-cap': GraduationCap, 'book-open': BookOpen, 'brain': Brain,
  'calculator': Calculator, 'laptop': Laptop, 'pen-tool': PenTool,
  'briefcase': Briefcase, 'building': Building, 'users': Users,
  'chart-bar': ChartBar, 'calendar': Calendar, 'clock': Clock, 'mail': Mail,
  'user': User, 'scissors': Scissors, 'camera': Camera, 'smartphone': Smartphone,
  'glasses': Glasses,
  'piggy-bank': PiggyBank, 'receipt': Receipt, 'banknote': Banknote,
  'trending-up': TrendingUp, 'trending-down': TrendingDown,
  'star': Star, 'zap': Zap, 'cloud': Cloud, 'globe': Globe,
  'anchor': Anchor, 'flag': Flag, 'more-horizontal': MoreHorizontal,
}

export function getIconComponent(iconName?: string): any | null {
  if (!iconName) return null
  return iconComponentMap[iconName] || null
}
