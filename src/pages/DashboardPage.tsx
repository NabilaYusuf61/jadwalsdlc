import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  FolderPlus,
  ListChecks,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { ProjectCard } from '../components/projects/ProjectCard'
import { ProjectFormModal } from '../components/projects/ProjectFormModal'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Form'
import { formatFullDateID, today } from '../lib/dates'
import { getProjectStats } from '../lib/schedule'
import type { Project, ProjectInput } from '../lib/types'
import { useAppStore } from '../store/useAppStore'

type SortMode = 'updated' | 'name' | 'start'

export function DashboardPage() {
  const projects = useAppStore((state) => state.projects)
  const createProject = useAppStore((state) => state.createProject)
  const updateProject = useAppStore((state) => state.updateProject)
  const deleteProject = useAppStore((state) => state.deleteProject)
  const duplicateProject = useAppStore((state) => state.duplicateProject)
  const loadSampleProject = useAppStore((state) => state.loadSampleProject)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const projectStats = useMemo(
    () => projects.map((project) => ({ project, stats: getProjectStats(project) })),
    [projects],
  )

  const totals = useMemo(() => {
    const tasks = projectStats.reduce((sum, item) => sum + item.stats.totalTasks, 0)
    const done = projectStats.reduce((sum, item) => sum + item.stats.done, 0)
    const inProgress = projectStats.reduce((sum, item) => sum + item.stats.inProgress, 0)
    const overdue = projectStats.reduce((sum, item) => sum + item.stats.overdue, 0)
    return {
      tasks,
      done,
      inProgress,
      overdue,
      progress: tasks === 0 ? 0 : Math.round((done / tasks) * 100),
    }
  }, [projectStats])

  const visibleProjects = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = projectStats.filter(({ project }) => {
      if (!needle) return true
      return [project.name, project.organization, project.description]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    return filtered.sort((a, b) => {
      if (sortMode === 'name') return a.project.name.localeCompare(b.project.name)
      if (sortMode === 'start') return a.project.startDate.localeCompare(b.project.startDate)
      return b.project.updatedAt.localeCompare(a.project.updatedAt)
    })
  }, [projectStats, query, sortMode])

  const handleCreate = (values: ProjectInput) => {
    if (editingProject) {
      updateProject(editingProject.id, values)
      return
    }
    const id = createProject(values)
    navigate(`/projects/${id}`)
  }

  const openCreate = () => {
    setEditingProject(undefined)
    setFormOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditingProject(project)
    setFormOpen(true)
  }

  const handleLoadSample = () => {
    const id = loadSampleProject()
    navigate(`/projects/${id}`)
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">
            Ruang kerja · {formatFullDateID(today())}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
            Proyek pengembangan
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
            Kelola jadwal, tugas, kalender kerja, dan tim dalam satu tampilan Gantt chart.
          </p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Proyek baru
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<FolderKanban className="h-4 w-4" />}
          label="Total proyek"
          value={projects.length}
          hint="proyek tersimpan"
        />
        <StatCard
          icon={<ListChecks className="h-4 w-4" />}
          label="Total tugas"
          value={totals.tasks}
          hint={`${totals.inProgress} sedang berjalan`}
          iconClass="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Tugas selesai"
          value={totals.done}
          hint={`${totals.progress}% dari seluruh tugas`}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Perlu perhatian"
          value={totals.overdue}
          hint={totals.overdue > 0 ? 'tugas melewati jadwal' : 'semua sesuai jadwal'}
          iconClass={
            totals.overdue > 0
              ? 'bg-red-50 text-red-600'
              : 'bg-slate-100 text-slate-500'
          }
          accent={totals.overdue > 0}
        />
      </section>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-7 w-7" />}
          title="Belum ada proyek"
          description="Buat proyek pertama Anda, atau muat proyek contoh SDLC lengkap untuk mencoba semua fitur Gantt chart."
          action={
            <>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Buat proyek pertama
              </Button>
              <Button variant="secondary" onClick={handleLoadSample}>
                <Sparkles className="h-4 w-4" /> Muat contoh proyek
              </Button>
            </>
          }
        />
      ) : (
        <>
          <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari proyek atau organisasi..."
                className="pl-9 pr-9"
                aria-label="Cari proyek"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-400 sm:inline">
                {visibleProjects.length} proyek
              </span>
              <Select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                aria-label="Urutkan proyek"
                className="h-9 w-44 text-xs"
              >
                <option value="updated">Terakhir diubah</option>
                <option value="name">Nama A–Z</option>
                <option value="start">Tanggal mulai</option>
              </Select>
            </div>
          </section>

          {visibleProjects.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="Proyek tidak ditemukan"
              description={`Tidak ada proyek yang cocok dengan “${query}”. Coba kata kunci lain.`}
              action={
                <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                  Hapus pencarian
                </Button>
              }
              className="py-10"
            />
          ) : (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map(({ project, stats }) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  stats={stats}
                  onEdit={() => openEdit(project)}
                  onDuplicate={() => duplicateProject(project.id)}
                  onDelete={() => setDeleteTarget(project)}
                />
              ))}
            </section>
          )}
        </>
      )}

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        project={editingProject}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget.id)
        }}
        title="Hapus proyek?"
        description={`Proyek “${deleteTarget?.name ?? ''}” beserta seluruh tugas, anggota tim, dan pengaturannya akan dihapus dari perangkat ini. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, hapus proyek"
      />
    </div>
  )
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number
  hint: string
  iconClass?: string
  accent?: boolean
}

function StatCard({
  icon,
  label,
  value,
  hint,
  iconClass = 'bg-brand-50 text-brand-600',
  accent = false,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-extrabold tabular-nums tracking-tight ${
          accent ? 'text-red-600' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
    </div>
  )
}
