import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  startOfWeek,
} from 'date-fns'
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Info,
  Plus,
  ZoomIn,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  dayLabel,
  dayOfMonth,
  formatDateID,
  formatMonthShort,
  formatMonthYear,
  monthLabel,
  today,
  toDateKey,
  weekLabel,
} from '../../lib/dates'
import { holidayOn, isWorkingDay } from '../../lib/calendar'
import { computeSchedule, getCalendarSpanDays, isOverdue } from '../../lib/schedule'
import { getStage, SDLC_STAGES } from '../../lib/types'
import type { Project, Task } from '../../lib/types'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

type Scale = 'day' | 'week' | 'month'

const DAY_WIDTH: Record<Scale, number> = {
  day: 34,
  week: 15,
  month: 6.5,
}

const GROUP_HEIGHT = 34
const ROW_HEIGHT = 44
const HEADER_HEIGHT = 58
const LEFT_WIDTH = 292

interface GanttChartProps {
  project: Project
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

interface GroupRow {
  type: 'group'
  stage: (typeof SDLC_STAGES)[number]
  count: number
  height: number
}

interface TaskRow {
  type: 'task'
  task: Task
  top: number
  height: number
}

type Row = GroupRow | TaskRow

function buildBands(
  days: Date[],
  getKey: (date: Date) => string,
  getLabel: (date: Date) => string,
  widthPerDay: number,
) {
  const bands: Array<{ key: string; label: string; days: number }> = []
  for (const date of days) {
    const key = getKey(date)
    const last = bands[bands.length - 1]
    if (last && last.key === key) {
      last.days += 1
    } else {
      bands.push({ key, label: getLabel(date), days: 1 })
    }
  }
  return bands.map((band) => ({ ...band, width: band.days * widthPerDay }))
}

export function GanttChart({ project, onTaskClick, onAddTask }: GanttChartProps) {
  const [scale, setScale] = useState<Scale>('week')
  const scrollRef = useRef<HTMLDivElement>(null)
  const schedule = useMemo(() => computeSchedule(project), [project])
  const referenceToday = useMemo(() => today(), [])
  const dayWidth = DAY_WIDTH[scale]

  const range = useMemo(() => {
    const starts = schedule.ordered.map((entry) => entry.start.getTime())
    const ends = schedule.ordered.map((entry) => entry.end.getTime())
    const todayTime = referenceToday.getTime()
    const min = new Date(Math.min(...starts, todayTime))
    const max = new Date(Math.max(...ends, todayTime))
    const start = startOfWeek(addDays(min, -6), { weekStartsOn: 1 })
    const end = endOfWeek(addDays(max, 10), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })
    return { start, end, days }
  }, [schedule, referenceToday])

  const dayIndex = useMemo(() => {
    const map = new Map<string, number>()
    range.days.forEach((date, index) => map.set(toDateKey(date), index))
    return map
  }, [range.days])

  const rows = useMemo(() => {
    const result: Row[] = []
    let top = 0
    for (const stage of SDLC_STAGES) {
      const stageTasks = schedule.ordered
        .filter((entry) => entry.task.stage === stage.id)
        .sort(
          (a, b) =>
            a.start.getTime() - b.start.getTime() ||
            a.task.name.localeCompare(b.task.name),
        )
      result.push({ type: 'group', stage, count: stageTasks.length, height: GROUP_HEIGHT })
      top += GROUP_HEIGHT
      for (const entry of stageTasks) {
        result.push({ type: 'task', task: entry.task, top, height: ROW_HEIGHT })
        top += ROW_HEIGHT
      }
    }
    return { list: result, totalHeight: top }
  }, [schedule])

  const taskTop = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of rows.list) {
      if (row.type === 'task') map.set(row.task.id, row.top)
    }
    return map
  }, [rows])

  const timelineWidth = range.days.length * dayWidth
  const todayX = dayIndex.has(toDateKey(referenceToday))
    ? ((dayIndex.get(toDateKey(referenceToday)) ?? 0) + 0.5) * dayWidth
    : null

  const scrollToToday = () => {
    const container = scrollRef.current
    if (!container) return
    const target = todayX ?? 0
    container.scrollTo({
      left: Math.max(0, LEFT_WIDTH + target - container.clientWidth / 2),
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const frame = requestAnimationFrame(() => {
      const target = todayX ?? 0
      container.scrollLeft = Math.max(
        0,
        LEFT_WIDTH + target - container.clientWidth / 2,
      )
    })
    return () => cancelAnimationFrame(frame)
    // Hanya pusatkan ulang saat skala berubah agar posisi pengguna tidak terusik.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  const monthBands = useMemo(
    () =>
      buildBands(
        range.days,
        (date) => toDateKey(date).slice(0, 7),
        (date) => monthLabel(date),
        dayWidth,
      ),
    [range.days, dayWidth],
  )
  const yearBands = useMemo(
    () =>
      buildBands(
        range.days,
        (date) => String(date.getFullYear()),
        (date) => String(date.getFullYear()),
        dayWidth,
      ),
    [range.days, dayWidth],
  )
  const weekBands = useMemo(
    () =>
      buildBands(
        range.days,
        (date) => toDateKey(startOfWeek(date, { weekStartsOn: 1 })),
        (date) => weekLabel(startOfWeek(date, { weekStartsOn: 1 })),
        dayWidth,
      ),
    [range.days, dayWidth],
  )

  const dependencies = useMemo(() => {
    const list: Array<{
      id: string
      predecessorId: string
      successorId: string
      type: 'FS' | 'SS'
    }> = []
    for (const entry of schedule.ordered) {
      for (const dependency of entry.task.dependencies) {
        if (
          schedule.byId[dependency.predecessorId] &&
          taskTop.has(dependency.predecessorId) &&
          taskTop.has(entry.task.id)
        ) {
          list.push({
            id: dependency.id,
            predecessorId: dependency.predecessorId,
            successorId: entry.task.id,
            type: dependency.type,
          })
        }
      }
    }
    return list
  }, [schedule, taskTop])

  if (project.tasks.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-7 w-7" />}
        title="Belum ada tugas untuk dijadwalkan"
        description="Tambahkan tugas pertama dengan durasi hari kerja. Batang Gantt, panah ketergantungan, dan ringkasan jadwal akan muncul otomatis."
        action={
          <Button onClick={onAddTask}>
            <Plus className="h-4 w-4" /> Tambah tugas pertama
          </Button>
        }
      />
    )
  }

  const hasCycle = schedule.cycleTaskIds.length > 0
  const hasMissing = schedule.missingDependencyIds.length > 0

  return (
    <div className="space-y-3">
      {hasCycle ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Terdapat dependensi yang membentuk lingkaran pada{' '}
            <strong>{schedule.cycleTaskIds.length} tugas</strong>. Jadwal tugas
            tersebut memakai tanggal acuan sampai siklus diperbaiki.
          </p>
        </div>
      ) : null}
      {hasMissing ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {schedule.missingDependencyIds.length} dependensi merujuk pada tugas yang
            sudah tidak ada dan diabaikan.
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(
                [
                  { id: 'day', label: 'Hari' },
                  { id: 'week', label: 'Minggu' },
                  { id: 'month', label: 'Bulan' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScale(item.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition',
                    scale === item.id
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                  aria-pressed={scale === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={scrollToToday}>
              <ZoomIn className="h-3.5 w-3.5" /> Hari ini
            </Button>
          </div>

          <div className="hidden items-center gap-3 text-[10px] font-medium text-slate-400 md:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-100 ring-1 ring-slate-200" />{' '}
              Akhir pekan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-100 ring-1 ring-rose-200" />{' '}
              Hari libur
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="22" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="18" y2="4" stroke="#94a3b8" strokeWidth="1.5" />
                <path d="M18 1 L22 4 L18 7 Z" fill="#94a3b8" />
              </svg>
              Ketergantungan
            </span>
          </div>
        </div>

        <div ref={scrollRef} className="scrollbar-thin overflow-x-auto">
          <div
            className="relative flex"
            style={{ minWidth: LEFT_WIDTH + timelineWidth }}
          >
            {/* Kolom kiri */}
            <div
              className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white"
              style={{ width: LEFT_WIDTH }}
            >
              <div
                className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4"
                style={{ height: HEADER_HEIGHT }}
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Kegiatan
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {project.tasks.length} tugas · 6 tahap SDLC
                  </p>
                </div>
                <span className="rounded-md bg-white px-1.5 py-1 text-[10px] font-semibold text-slate-400 ring-1 ring-slate-200">
                  {formatDateID(range.start, false)} – {formatDateID(range.end, false)}
                </span>
              </div>

              {rows.list.map((row) =>
                row.type === 'group' ? (
                  <div
                    key={row.stage.id}
                    className="flex items-center gap-2 border-y border-slate-100 bg-slate-50/90 px-4"
                    style={{ height: row.height }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.stage.color }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {row.stage.label}
                    </span>
                    <span className="ml-auto text-[10px] font-medium text-slate-400">
                      {row.count}
                    </span>
                  </div>
                ) : (
                  <button
                    key={row.task.id}
                    type="button"
                    onClick={() => onTaskClick(row.task)}
                    className="group flex w-full items-center gap-2.5 border-b border-slate-50 px-4 text-left transition hover:bg-brand-50/50"
                    style={{ height: row.height }}
                    title={`Ubah ${row.task.name}`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: row.task.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-700 group-hover:text-brand-700">
                        {row.task.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                        {project.members.find((m) => m.id === row.task.assigneeId)?.name ??
                          'Tanpa PIC'}{' '}
                        · {row.task.durationDays} hari kerja
                      </span>
                    </span>
                    {row.task.status === 'done' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : row.task.status === 'in_progress' ? (
                      <CircleDot className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    ) : null}
                  </button>
                ),
              )}
            </div>

            {/* Timeline */}
            <div className="relative shrink-0" style={{ width: timelineWidth }}>
              <div style={{ height: HEADER_HEIGHT }} className="border-b border-slate-200 bg-white">
                <div className="flex h-[26px] border-b border-slate-100">
                  {(scale === 'month' ? yearBands : monthBands).map((band) => (
                    <div
                      key={band.key}
                      className="flex items-center overflow-hidden border-r border-slate-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                      style={{ width: band.width }}
                    >
                      <span className="truncate">
                        {scale === 'month' ? band.label : formatMonthYear(new Date(`${band.key}-15T00:00:00`))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex h-[31px]">
                  {scale === 'month'
                    ? monthBands.map((band) => (
                        <div
                          key={band.key}
                          className="flex items-center border-r border-slate-100 px-2 text-[10px] font-medium text-slate-500"
                          style={{ width: band.width }}
                        >
                          <span className="truncate">{formatMonthShort(new Date(`${band.key}-15T00:00:00`))}</span>
                        </div>
                      ))
                    : scale === 'week'
                      ? weekBands.map((band) => (
                          <div
                            key={band.key}
                            className="flex items-center border-r border-slate-100 px-1.5 text-[10px] font-medium text-slate-500"
                            style={{ width: band.width }}
                          >
                            <span className="truncate">{band.label}</span>
                          </div>
                        ))
                      : range.days.map((date) => {
                          const key = toDateKey(date)
                          const isToday = key === toDateKey(referenceToday)
                          const off = !isWorkingDay(project.calendar, date)
                          return (
                            <div
                              key={key}
                              className={cn(
                                'flex flex-col items-center justify-center border-r border-slate-100 text-[9px] leading-tight',
                                off && 'bg-slate-50 text-slate-400',
                                isToday && 'bg-brand-600 font-bold text-white',
                              )}
                              style={{ width: dayWidth }}
                            >
                              <span className="font-semibold">{dayOfMonth(date)}</span>
                              <span className="opacity-70">{dayLabel(date)}</span>
                            </div>
                          )
                        })}
                </div>
                {todayX !== null ? (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-brand-500"
                    style={{ left: todayX }}
                    aria-hidden="true"
                  >
                    <span className="absolute -left-1.5 bottom-0 h-2 w-2 rounded-full bg-brand-500" />
                  </div>
                ) : null}
              </div>

              <div className="relative" style={{ height: rows.totalHeight }}>
                {/* Latar hari kerja, akhir pekan, hari libur */}
                <div className="absolute inset-0 flex" aria-hidden="true">
                  {range.days.map((date) => {
                    const holiday = holidayOn(project.calendar, date)
                    const working = isWorkingDay(project.calendar, date)
                    return (
                      <div
                        key={toDateKey(date)}
                        style={{ width: dayWidth }}
                        className={cn(
                          'h-full shrink-0 border-r border-slate-100/70',
                          holiday
                            ? 'bg-rose-50/80'
                            : working
                              ? 'bg-white'
                              : 'bg-slate-50',
                        )}
                        title={holiday ? holiday.name : undefined}
                      />
                    )
                  })}
                </div>

                {/* Panah dependensi */}
                <svg
                  className="pointer-events-none absolute inset-0 z-10"
                  width={timelineWidth}
                  height={rows.totalHeight}
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="gantt-arrow"
                      viewBox="0 0 8 8"
                      refX="7"
                      refY="4"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
                    </marker>
                  </defs>
                  {dependencies.map((dependency) => {
                    const predecessor = schedule.byId[dependency.predecessorId]
                    const successor = schedule.byId[dependency.successorId]
                    if (!predecessor || !successor) return null
                    const predTop = taskTop.get(predecessor.task.id)
                    const succTop = taskTop.get(successor.task.id)
                    if (predTop === undefined || succTop === undefined) return null
                    const predecessorStart = dayIndex.get(toDateKey(predecessor.start)) ?? 0
                    const predecessorEnd = dayIndex.get(toDateKey(predecessor.end)) ?? 0
                    const successorStart = dayIndex.get(toDateKey(successor.start)) ?? 0
                    const x1 =
                      dependency.type === 'FS'
                        ? (predecessorEnd + 1) * dayWidth - 2
                        : predecessorStart * dayWidth + 4
                    const y1 = predTop + ROW_HEIGHT / 2 + 4
                    const x2 = successorStart * dayWidth + 1
                    const y2 = succTop + ROW_HEIGHT / 2 - 4
                    const curve = Math.max(
                      6,
                      Math.min(28, Math.abs(x2 - x1) / 2 + 4),
                    )
                    const path = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2 - 3} ${y2}`
                    return (
                      <path
                        key={dependency.id}
                        d={path}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth={1.3}
                        strokeLinejoin="round"
                        markerEnd="url(#gantt-arrow)"
                        opacity={0.8}
                      />
                    )
                  })}
                </svg>

                {/* Baris & batang tugas */}
                <div className="relative z-20">
                  {rows.list.map((row) =>
                    row.type === 'group' ? (
                      <div
                        key={`bg-${row.stage.id}`}
                        className="border-y border-slate-100 bg-slate-50/90"
                        style={{ height: row.height }}
                      />
                    ) : (
                      <div
                        key={row.task.id}
                        className="group/row relative border-b border-slate-50/80"
                        style={{ height: row.height }}
                      >
                        <TaskBar
                          project={project}
                          task={row.task}
                          entry={schedule.byId[row.task.id]}
                          left={
                            (dayIndex.get(toDateKey(schedule.byId[row.task.id].start)) ?? 0) *
                            dayWidth
                          }
                          width={Math.max(
                            10,
                            getCalendarSpanDays(schedule.byId[row.task.id]) * dayWidth - 3,
                          )}
                          onClick={() => onTaskClick(row.task)}
                        />
                      </div>
                    ),
                  )}
                </div>

                {todayX !== null ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-30 w-px bg-brand-500/60"
                    style={{ left: todayX }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[10px] text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400" /> Belum mulai
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> Berjalan
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Selesai
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Terlambat
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Klik batang atau nama tugas untuk mengubahnya
          </span>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Panjang batang mengikuti hari kalender; durasi dihitung dari hari kerja pada
        kalender proyek. Panah menandai FS (selesai → mulai) dan SS (mulai → mulai).
      </p>
    </div>
  )
}

interface TaskBarProps {
  project: Project
  task: Task
  entry: ReturnType<typeof computeSchedule>['byId'][string]
  left: number
  width: number
  onClick: () => void
}

function TaskBar({ project, task, entry, left, width, onClick }: TaskBarProps) {
  const member = project.members.find((item) => item.id === task.assigneeId)
  const late = isOverdue(entry)
  const statusLabel =
    task.status === 'done' ? 'Selesai' : task.status === 'in_progress' ? 'Berjalan' : 'Belum mulai'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute top-[9px] flex h-[26px] items-center gap-1 overflow-hidden rounded-md px-2 text-left text-[10px] font-semibold text-white shadow-sm transition hover:z-10 hover:brightness-110 hover:ring-2 hover:ring-white/80 focus-visible:ring-2 focus-visible:ring-white',
        task.status === 'done' && 'opacity-90',
        late && 'ring-2 ring-red-500 ring-offset-1 ring-offset-white',
      )}
      style={{ left: left + 1.5, width, backgroundColor: task.color }}
      title={`${task.name} · ${statusLabel} · ${formatDateID(entry.start, false)}–${formatDateID(entry.end, false)} · ${task.durationDays} hari kerja${member ? ` · ${member.name}` : ''}`}
      aria-label={`${task.name}, ${getStage(task.stage).label}, ${task.durationDays} hari kerja, status ${statusLabel}`}
    >
      {task.status === 'done' ? (
        <CheckCircle2 className="h-3 w-3 shrink-0 opacity-90" />
      ) : task.status === 'in_progress' ? (
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-white/90" />
      ) : null}
      <span className="truncate">{task.name}</span>
      {width > 90 ? (
        <span className="ml-auto shrink-0 pl-1 text-[9px] font-medium opacity-80">
          {task.durationDays}h
        </span>
      ) : null}
    </button>
  )
}
