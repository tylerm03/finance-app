import {
  Baby,
  Briefcase,
  Building2,
  Car,
  Coins,
  DollarSign,
  Flag,
  Gem,
  Gift,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Landmark,
  Map,
  Palmtree,
  PiggyBank,
  Plane,
  Shield,
  Sparkles,
  Star,
  Sunrise,
  Target,
  TrendingUp,
  Umbrella,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  'trending-up': TrendingUp,
  sunrise: Sunrise,
  home: Home,
  car: Car,
  'graduation-cap': GraduationCap,
  baby: Baby,
  plane: Plane,
  palmtree: Palmtree,
  gift: Gift,
  briefcase: Briefcase,
  'heart-pulse': HeartPulse,
  gem: Gem,
  hammer: Hammer,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
  'building-2': Building2,
  shield: Shield,
  umbrella: Umbrella,
  coins: Coins,
  wallet: Wallet,
  'dollar-sign': DollarSign,
  star: Star,
  sparkles: Sparkles,
  target: Target,
  map: Map,
  flag: Flag,
}

export function Icon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const C = ICONS[name] || TrendingUp
  return <C size={size} strokeWidth={2} className={className} />
}

// Scenario colors: [background, foreground]
export const SCENARIO_COLORS: [string, string][] = [
  ['#ecebe8', '#5f5b55'],
  ['#fde3d7', '#c2501a'],
  ['#fbe3c8', '#b4661c'],
  ['#f6edc0', '#8a6d00'],
  ['#e3efc9', '#4d7a1e'],
  ['#d4efe2', '#1d7a52'],
  ['#d3eef0', '#13708a'],
  ['#dbe6fb', '#2b5fb3'],
  ['#e5e1fb', '#5a45c4'],
  ['#efdcf8', '#8a3fb3'],
  ['#fbdcea', '#b3306b'],
  ['#f2e1d5', '#8a5a3b'],
]

export function colorPair(bg: string): [string, string] {
  return SCENARIO_COLORS.find(([b]) => b === bg) || SCENARIO_COLORS[0]
}

// Marker colors by event type
export const EVENT_COLORS: Record<string, [string, string]> = {
  one_time_expense: ['#fde3d7', '#c2501a'],
  one_time_income: ['#dbe6fb', '#2b5fb3'],
  recurring_expense: ['#f6e3a8', '#8a6d00'],
  recurring_income: ['#d4efe2', '#1d7a52'],
  retirement: ['#fbd9c4', '#c2501a'],
  end: ['#e6e4e0', '#4a4641'],
}
