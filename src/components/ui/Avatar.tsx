import { cn } from '../../lib/cn'
import type { Member } from '../../lib/types'

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

interface AvatarProps {
  member?: Pick<Member, 'name' | 'color'> | null
  size?: keyof typeof sizes
  className?: string
}

export function Avatar({ member, size = 'md', className }: AvatarProps) {
  if (!member) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-400 ring-2 ring-white',
          sizes[size],
          className,
        )}
        title="Belum ada penanggung jawab"
      >
        ?
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white',
        sizes[size],
        className,
      )}
      style={{ backgroundColor: member.color }}
      title={member.name}
    >
      {initials(member.name)}
    </span>
  )
}

interface AvatarGroupProps {
  members: Array<Pick<Member, 'id' | 'name' | 'color'>>
  max?: number
  size?: keyof typeof sizes
}

export function AvatarGroup({ members, max = 4, size = 'sm' }: AvatarGroupProps) {
  if (members.length === 0) {
    return <span className="text-xs text-slate-400">Belum ada anggota</span>
  }
  const visible = members.slice(0, max)
  const overflow = members.length - visible.length
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((member) => (
        <Avatar key={member.id} member={member} size={size} />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 ring-2 ring-white',
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
