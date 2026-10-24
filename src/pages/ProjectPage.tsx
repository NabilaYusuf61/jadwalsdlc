import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  Download,
  Plus,
  Settings2,
  Table2,
  Users,
  BarChart3,
  FolderX,
} from 'lucide-react'
import { CalendarView } from '../components/workspace/CalendarView'
import { GanttChart } from '../components/workspace/GanttChart'
import { ScheduleView } from '../components/workspace/ScheduleView'
import { SettingsView } from '../components/workspace/SettingsView'
import { TaskDrawer } from '../components/workspace/TaskDrawer'
import { TeamView } from '../components/workspace/TeamView'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Progress } from '../components/ui/Progress'
import { formatRangeID } from '../lib/dates'
import { downloadProjectJson } from '../lib/download'
import { computeSchedule, getProjectStats } from '../lib/schedule'
import { formatWorkDays } from '../lib/calendar'
import type { Project, Task } from '../lib/types'
import { useAppStore, useProject } from '../store/useAppStore'

type TabId = 'gantt' | 'schedule' | 'team' | 'calendar' | 'settings'

const TABS: Array<{ id: TabId; label: string; icon: typeof BarChart3 }> = [
  { id: 'gantt', label: 'Gantt Chart', icon: BarChart3 },
  { id: 'schedule', label: 'Jadwal', icon: Table2 },
  { id: 'team', label: 'Tim', icon: Users },
  { id: 'calendar', label: 'Kalender Kerja', icon: CalendarDays },
  { id: 'settings', label: 'Pengaturan', icon: Settings2 },
]

export function ProjectPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const navigate = useNavigate()

  if (!project) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <FolderX className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Proyek tidak ditemukan</h1>
        <p className="mt-1.5 max-w-sm text-sm text-slate-500">
          Proyek yang Anda cari mungkin sudah dihapus dari perangkat ini.
        </p>
        <Button size="sm" className="mt-5" onClick={() => navigate('/')}>
          Kembali ke dashboard
        </Button>
      </div>
    )
  }

  return <ProjectWorkspace key={project.id} project={project} />
}

function ProjectWorkspace({ project }: { project: Project }) {
  const navigate = useNavigate()
  const updateTask = useAppStore((state) => state.updateTask)
  const addTask = useAppStore((state) => state.addTask)
  const deleteTask = useAppStore((state) => state.deleteTask)

  const [activeTab, setActiveTab] = useState<TabId>('gantt')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)

  const schedule = useMemo(() => computeSchedule(project), [project])
  const stats = useMemo(() => getProjectStats(project), [project])

  const openNewTask = () => {
    setEditingTask(undefined)
    setDrawerOpen(true)
  }

  const openTask = (task: Task) => {
    setEditingTask(task)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <Link to="/" className="font-medium text-slate-500 transition hover:text-brand-600">
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="max-w-[220px] truncate font-medium text-slate-600 sm:max-w-none">
          {project.name}
        </span>
      </div>

      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
                {project.name}
              </h1>
              <Badge tone="brand" dot>
                {stats.totalTasks === 0
                  ? 'Baru'
                  : stats.progress === 100
                    ? 'Selesai'
                    : 'Aktif'}
              </Badge>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {project.organization || 'Tanpa organisasi'}
            </p>
            {project.description ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                {project.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadProjectJson(project)}
              title="Ekspor proyek sebagai JSON"
            >
              <Download className="h-3.5 w-3.5" /> Ekspor
            </Button>
            <Button size="sm" onClick={openNewTask}>
              <Plus className="h-4 w-4" /> Tugas baru
            </Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Progres proyek
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl font-extrabold tabular-nums text-slate-900">
                {stats.progress}%
              </span>
              <span className="text-[11px] text-slate-400">
                {stats.done}/{stats.totalTasks} tugas selesai
              </span>
            </div>
            <Progress
              value={stats.progress}
              className="mt-2"
              barClassName={stats.progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}
            />
          </div>
          <div className="sm:border-l sm:border-slate-100 sm:pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Rentang jadwal
            </p>
            <p className="mt-1.5 text-sm font-bold text-slate-800">
              {schedule.projectStart && schedule.projectEnd
                ? formatRangeID(schedule.projectStart, schedule.projectEnd)
                : 'Belum dijadwalkan'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {formatWorkDays(project.calendar.workDays)}
            </p>
          </div>
          <div className="sm:border-l sm:border-slate-100 sm:pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Status tugas
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {stats.done} selesai
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                {stats.inProgress} berjalan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                {stats.todo} belum
              </span>
            </div>
            {stats.overdue > 0 ? (
              <p className="mt-1 text-[11px] font-semibold text-red-600">
                {stats.overdue} tugas melewati jadwal
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">Tidak ada tugas terlambat</p>
            )}
          </div>
          <div className="sm:border-l sm:border-slate-100 sm:pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Tim proyek
            </p>
            <p className="mt-1.5 text-sm font-bold text-slate-800">
              {project.members.length} anggota
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className="mt-0.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Kelola anggota tim
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200">
        <nav
          className="scrollbar-thin -mb-px flex gap-1 overflow-x-auto"
          aria-label="Bagian proyek"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            const count =
              tab.id === 'schedule' && project.tasks.length > 0
                ? project.tasks.length
                : tab.id === 'team' && project.members.length > 0
                  ? project.members.length
                  : null
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {count !== null ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="min-w-0">
        {activeTab === 'gantt' ? (
          <GanttChart
            project={project}
            onTaskClick={openTask}
            onAddTask={openNewTask}
          />
        ) : null}
        {activeTab === 'schedule' ? (
          <ScheduleView
            project={project}
            onTaskClick={openTask}
            onAddTask={openNewTask}
          />
        ) : null}
        {activeTab === 'team' ? <TeamView project={project} /> : null}
        {activeTab === 'calendar' ? <CalendarView project={project} /> : null}
        {activeTab === 'settings' ? (
          <SettingsView project={project} onDeleted={() => navigate('/')} />
        ) : null}
      </div>

      <TaskDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        project={project}
        task={editingTask}
        onSave={(values) => {
          if (editingTask) {
            updateTask(project.id, editingTask.id, values)
          } else {
            addTask(project.id, values)
          }
          setDrawerOpen(false)
        }}
        onDelete={(taskId) => {
          deleteTask(project.id, taskId)
          setDrawerOpen(false)
        }}
      />
    </div>
  )
}
