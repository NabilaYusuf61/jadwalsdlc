import { cn } from '../../lib/cn'

interface ProgressProps {
  value: number
  className?: string
  barClassName?: string
  label?: string
}

export function Progress({ value, className, barClassName, label }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label ?? 'Progres proyek'}
    >
      <div
        className={cn(
          'h-full rounded-full bg-brand-500 transition-[width] duration-500',
          barClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
