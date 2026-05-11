'use client'

import { cn } from '@/lib/utils/cn'
import type { ProjectStatus } from '@/types'

const ALL_STATUSES: ProjectStatus[] = ['Idea', 'In Flight', 'On Hold', 'Complete']

interface FilterChipsProps {
  selected: ProjectStatus | null
  onChange: (status: ProjectStatus | null) => void
}

export function FilterChips({ selected, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full px-3 py-1 text-sm font-medium transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 cursor-pointer',
          selected === null
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
        )}
      >
        All
      </button>
      {ALL_STATUSES.map((status) => (
        <button
          key={status}
          onClick={() => onChange(status)}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 cursor-pointer',
            selected === status
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
          )}
        >
          {status}
        </button>
      ))}
    </div>
  )
}
