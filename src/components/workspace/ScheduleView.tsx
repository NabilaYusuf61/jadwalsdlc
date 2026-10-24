import { useMemo, useState } from 'react'
import { CalendarClock, FilterX, ListChecks, Plus, Search } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge, priorityTone, statusTone } from '../ui/Badge'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Input, Select } from '../ui/Form'
import { countCalendarDays } from '../../lib/calendar'
import { formatDateID } from '../../lib/dates'
import { computeSchedule, isOverdue } from '../../lib/schedule'
import {
  getPriority,
  getStage,
  getTaskStatus,
  SDLC_STAGES,
  TASK_STATUSES,
} from '../../lib/types'
import type { Project, Task } from '../../lib/types'

interface ScheduleViewProps {
  project: Project
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export function ScheduleView({ project, onTaskClick, onAddTask }: ScheduleViewProps) {
  const schedule = useMemo(() => computeSchedule(project), [project])
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('all')
  const [status, setStatus] = useState('all')
  const [memberId, setMemberId] = useState('all')

  const orderMap = useMemo(() => {
    const map = new Map<string, number>()
    schedule.ordered.forEach((entry, index) => map.set(entry.task.id, index + 1))
    return map
  }, [schedule])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return schedule.ordered.filter((entry) => {
      const task = entry.task
      if (stage !== 'all' && task.stage !== stage) return false
      if (status !== 'all' && task.status !== status) return false
      if (memberId !== 'all' && task.assigneeId !== memberId) return false
      if (needle && !task.name.toLowerCase().includes(needle)) return false
      return true
    })
  }, [schedule, query, stage, status, memberId])

  const hasFilter = query !== '' || stage !== 'all' || status !== 'all' || memberId !== 'all'

  if (project.tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="h-7 w-7" />}
        title="Informasi jadwal belum tersedia"
        description="Tambahkan tugas beserta durasi dan penanggung jawabnya. Daftar urutan, jadwal, dan status akan dirangkum di sini."
        action={
          <Button onClick={onAddTask}>
            <Plus className="h-4 w-4" /> Tambah tugas
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Informasi jadwal proyek</h2>
              <p className="text-[11px] text-slate-400">
                Urutan pengerjaan otomatis mengikuti kalender kerja dan dependensi.
              </p>
            </div>
            <Button size="sm" onClick={onAddTask}>
              <Plus className="h-3.5 w-3.5" /> Tugas baru
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:max-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari kegiatan..."
                className="h-9 pl-8 text-xs"
                aria-label="Cari kegiatan"
              />
            </div>
            <Select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              aria-label="Filter tahapan"
              className="h-9 w-auto min-w-[140px] text-xs"
            >
              <option value="all">Semua tahapan</option>
              {SDLC_STAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter status"
              className="h-9 w-auto min-w-[120px] text-xs"
            >
              <option value="all">Semua status</option>
              {TASK_STATUSES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              aria-label="Filter penanggung jawab"
              className="h-9 w-auto min-w-[140px] text-xs"
            >
              <option value="all">Semua anggota</option>
              {project.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
            {hasFilter ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setStage('all')
                  setStatus('all')
                  setMemberId('all')
                }}
              >
                <FilterX className="h-3.5 w-3.5" /> Reset
              </Button>
            ) : null}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase tracking-wide text-slate-400">
                <th className="w-12 px-3 py-2.5 font-bold">No</th>
                <th className="min-w-[220px] px-3 py-2.5 font-bold">Kegiatan</th>
                <th className="w-24 px-3 py-2.5 font-bold">Durasi</th>
                <th className="min-w-[160px] px-3 py-2.5 font-bold">Jadwal</th>
                <th className="w-24 px-3 py-2.5 font-bold">Prioritas</th>
                <th className="w-28 px-3 py-2.5 font-bold">Status</th>
                <th className="min-w-[150px] px-3 py-2.5 font-bold">Penanggung jawab</th>
                <th className="w-28 px-3 py-2.5 font-bold">Dependensi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const task = entry.task
                const member = project.members.find((item) => item.id === task.assigneeId)
                const stageMeta = getStage(task.stage)
                const dependencies = task.dependencies.filter((dependency) =>
                  schedule.byId[dependency.predecessorId],
                )
                return (
                  <tr
                    key={task.id}
                    className="border-b border-slate-100 transition last:border-b-0 hover:bg-brand-50/30"
                  >
                    <td className="px-3 py-3 align-middle">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                        {orderMap.get(task.id)}
                      </span>
                    </td>
                    <td className="max-w-[340px] px-3 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => onTaskClick(task)}
                        className="block max-w-full truncate text-left text-[13px] font-semibold text-slate-800 transition hover:text-brand-700"
                        title={`Ubah ${task.name}`}
                      >
                        {task.name}
                      </button>
                      <span className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: stageMeta.color }}
                        />
                        {stageMeta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="font-semibold text-slate-700">
                        {entry.durationDays} hari
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {countCalendarDays(entry.start, entry.end)} kalender
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="font-medium text-slate-700">
                        {formatDateID(entry.start, false)} – {formatDateID(entry.end, false)}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                        {isOverdue(entry) ? (
                          <Badge tone="red">Terlambat</Badge>
                        ) : entry.constrainedByDependency ? (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" /> mengikuti dependensi
                          </span>
                        ) : (
                          'tanggal acuan'
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Badge tone={priorityTone(task.priority)} dot>
                        {getPriority(task.priority).label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Badge tone={statusTone(task.status)} dot>
                        {getTaskStatus(task.status).label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="flex items-center gap-2">
                        <Avatar member={member} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-700">
                            {member?.name ?? 'Belum ditetapkan'}
                          </span>
                          {member?.role ? (
                            <span className="block truncate text-[10px] text-slate-400">
                              {member.role}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {dependencies.length === 0 ? (
                        <span className="text-[10px] text-slate-400">—</span>
                      ) : (
                        <span
                          className="flex flex-wrap items-center gap-1"
                          title={dependencies
                            .map((dependency) => {
                              const predecessor = schedule.byId[dependency.predecessorId]
                              return `${predecessor?.task.name ?? 'Tugas'} (${dependency.type}${dependency.lagDays > 0 ? ` +${dependency.lagDays} hari` : ''})`
                            })
                            .join('\n')}
                        >
                          <span className="text-[10px] font-semibold text-slate-500">
                            {dependencies.length} pendahulu
                          </span>
                          {dependencies.slice(0, 2).map((dependency) => (
                            <span
                              key={dependency.id}
                              className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-500"
                            >
                              {dependency.type}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Tampilan kartu untuk layar kecil */}
        <div className="divide-y divide-slate-100 md:hidden">
          {filtered.map((entry) => {
            const task = entry.task
            const member = project.members.find((item) => item.id === task.assigneeId)
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick(task)}
                className="block w-full px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                      #{orderMap.get(task.id)} · {getStage(task.stage).label}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">
                      {task.name}
                    </p>
                  </div>
                  <Badge tone={statusTone(task.status)} dot>
                    {getTaskStatus(task.status).label}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  <span>
                    {formatDateID(entry.start, false)} – {formatDateID(entry.end, false)}
                  </span>
                  <span>{entry.durationDays} hari kerja</span>
                  <Badge tone={priorityTone(task.priority)}>
                    {getPriority(task.priority).label}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Avatar member={member} size="xs" />
                    {member?.name ?? 'Tanpa PIC'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Tidak ada tugas yang cocok
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Ubah kata kunci atau filter yang dipilih.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
        <p>
          Menampilkan {filtered.length} dari {project.tasks.length} tugas.
        </p>
        <p>
          {schedule.projectStart && schedule.projectEnd
            ? `${countCalendarDays(schedule.projectStart, schedule.projectEnd)} hari kalender proyek`
            : 'Jadwal belum tersedia'}
        </p>
      </div>
    </div>
  )
}
