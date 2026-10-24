import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Building2,
  CalendarRange,
  Copy,
  ListChecks,
  Pencil,
  Trash2,
} from 'lucide-react'
import { formatDateID, formatRangeID } from '../../lib/dates'
import type { ProjectStats } from '../../lib/schedule'
import type { Project } from '../../lib/types'
import { Badge } from '../ui/Badge'
import { ActionMenu } from '../ui/ActionMenu'
import { AvatarGroup } from '../ui/Avatar'
import { Progress } from '../ui/Progress'

interface ProjectCardProps {
  project: Project
  stats: ProjectStats
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function cardStatus(stats: ProjectStats) {
  if (stats.totalTasks === 0) {
    return { label: 'Baru', tone: 'neutral' as const }
  }
  if (stats.progress === 100) return { label: 'Selesai', tone: 'green' as const }
  if (stats.overdue > 0) return { label: 'Perlu perhatian', tone: 'red' as const }
  if (stats.inProgress > 0) return { label: 'Berjalan', tone: 'brand' as const }
  return { label: 'Direncanakan', tone: 'cyan' as const }
}

export function ProjectCard({
  project,
  stats,
  onEdit,
  onDuplicate,
  onDelete,
}: ProjectCardProps) {
  const status = cardStatus(stats)
  const start = stats.projectStart
  const end = stats.projectEnd

  return (
    <article className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5">
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-brand-500 via-brand-400 to-violet-400 opacity-80" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 text-brand-600 ring-1 ring-brand-100">
            <ListChecks className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold leading-tight text-slate-900">
              <Link
                to={`/projects/${project.id}`}
                className="after:absolute after:inset-0 after:z-10 after:rounded-2xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-500"
              >
                {project.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
              <Building2 className="h-3 w-3 shrink-0" />
              {project.organization || 'Tanpa organisasi'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <ActionMenu
            className="relative z-20"
            label={`Aksi untuk ${project.name}`}
            items={[
              { label: 'Ubah informasi', icon: Pencil, onSelect: onEdit },
              { label: 'Duplikat proyek', icon: Copy, onSelect: onDuplicate },
              { label: 'Hapus proyek', icon: Trash2, onSelect: onDelete, tone: 'danger' },
            ]}
          />
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-slate-500">
        {project.description || 'Belum ada deskripsi proyek.'}
      </p>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-slate-500">Progres</span>
          <span className="text-slate-700">
            {stats.done}/{stats.totalTasks} tugas · {stats.progress}%
          </span>
        </div>
        <Progress value={stats.progress} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5 text-[11px]">
        <div className="min-w-0">
          <span className="flex items-center gap-1 text-slate-400">
            <CalendarRange className="h-3 w-3" /> Jadwal
          </span>
          <p className="mt-0.5 truncate font-semibold text-slate-700">
            {start && end ? formatRangeID(start, end) : 'Belum dijadwalkan'}
          </p>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400">Tim ({project.members.length})</span>
          <div className="mt-1">
            <AvatarGroup members={project.members} size="xs" max={4} />
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4 text-[11px]">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {stats.done}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {stats.inProgress}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            {stats.todo}
          </span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <span className="hidden sm:inline">
            Diperbarui {formatDateID(new Date(project.updatedAt))}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
          Buka <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </article>
  )
}
