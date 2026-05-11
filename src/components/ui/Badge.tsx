import { cn } from '@/lib/utils/cn'
import type { ProjectStatus } from '@/types'

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Idea: 'bg-blue-100 text-blue-700',
  'In Flight': 'bg-amber-100 text-amber-700',
  'On Hold': 'bg-zinc-100 text-zinc-500',
  Complete: 'bg-green-100 text-green-700',
}

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple'
  className?: string
}

const VARIANT_STYLES: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
