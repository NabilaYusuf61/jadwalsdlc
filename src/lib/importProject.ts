import { DEFAULT_CALENDAR, PRIORITIES, SDLC_STAGES, TASK_STATUSES } from './types'
import type { AppSnapshot, Member, Project, Task, WorkCalendar } from './types'

type ImportResult = { ok: true; project: Project } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asDateKey(value: unknown, fallback: string): string {
  const text = asString(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback
}

function parseCalendar(value: unknown): WorkCalendar {
  if (!isRecord(value)) return { ...DEFAULT_CALENDAR, holidays: [] }
  const workDays = Array.isArray(value.workDays)
    ? value.workDays.filter(
        (day): day is number => typeof day === 'number' && day >= 0 && day <= 6,
      )
    : DEFAULT_CALENDAR.workDays
  const holidays = Array.isArray(value.holidays)
    ? value.holidays.flatMap((holiday) => {
        if (!isRecord(holiday)) return []
        const date = asDateKey(holiday.date, '')
        if (!date) return []
        return [
          {
            id: asString(holiday.id) || `hld_${date}`,
            date,
            name: asString(holiday.name, 'Hari libur'),
          },
        ]
      })
    : []
  return {
    workDays: workDays.length > 0 ? [...new Set(workDays)].sort((a, b) => a - b) : [1, 2, 3, 4, 5],
    holidays,
  }
}

function parseMembers(value: unknown): Member[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((member) => {
    if (!isRecord(member) || !asString(member.name)) return []
    return [
      {
        id: asString(member.id) || asString(member.name),
        name: asString(member.name),
        email: asString(member.email),
        role: asString(member.role),
        color: asString(member.color, '#3a67f5'),
      },
    ]
  })
}

function parseTasks(value: unknown, projectStart: string): Task[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((task) => {
    if (!isRecord(task) || !asString(task.name)) return []
    const stage = SDLC_STAGES.some((item) => item.id === task.stage)
      ? (task.stage as Task['stage'])
      : 'requirement'
    const priority = PRIORITIES.some((item) => item.id === task.priority)
      ? (task.priority as Task['priority'])
      : 'medium'
    const status = TASK_STATUSES.some((item) => item.id === task.status)
      ? (task.status as Task['status'])
      : 'todo'
    const duration = Number(task.durationDays)
    const dependencies = Array.isArray(task.dependencies)
      ? task.dependencies.flatMap((dependency) => {
          if (!isRecord(dependency)) return []
          const predecessorId = asString(dependency.predecessorId)
          if (!predecessorId) return []
          const type = dependency.type === 'SS' ? 'SS' : 'FS'
          const lag = Number(dependency.lagDays)
          return [
            {
              id: asString(dependency.id) || `dep_${predecessorId}`,
              predecessorId,
              type: type as 'FS' | 'SS',
              lagDays: Number.isFinite(lag) ? Math.max(0, Math.floor(lag)) : 0,
            },
          ]
        })
      : []
    return [
      {
        id: asString(task.id) || `tsk_${asString(task.name)}`,
        name: asString(task.name),
        stage,
        startDate: asDateKey(task.startDate, projectStart),
        durationDays: Number.isFinite(duration) ? Math.max(1, Math.floor(duration)) : 1,
        priority,
        status,
        color: asString(task.color, '#3a67f5'),
        assigneeId: asString(task.assigneeId) || null,
        dependencies,
        notes: asString(task.notes),
        createdAt: asString(task.createdAt, new Date().toISOString()),
      },
    ]
  })
}

export function parseProjectJson(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'File bukan JSON yang valid.' }
  }

  let raw: unknown = data
  if (isRecord(data) && Array.isArray(data.projects)) {
    const snapshot = data as unknown as AppSnapshot
    if (snapshot.projects.length === 0) {
      return { ok: false, error: 'File tidak berisi proyek apa pun.' }
    }
    raw = snapshot.projects[0]
  }

  if (!isRecord(raw)) {
    return { ok: false, error: 'Struktur file proyek tidak dikenali.' }
  }
  const name = asString(raw.name).trim()
  if (!name) return { ok: false, error: 'Proyek dalam file tidak memiliki nama.' }

  const createdAt = asString(raw.createdAt, new Date().toISOString())
  const projectStart = asDateKey(raw.startDate, new Date().toISOString().slice(0, 10))
  const project: Project = {
    id: asString(raw.id, ''),
    name,
    organization: asString(raw.organization),
    description: asString(raw.description),
    startDate: projectStart,
    tasks: parseTasks(raw.tasks, projectStart),
    members: parseMembers(raw.members),
    calendar: parseCalendar(raw.calendar),
    createdAt,
    updatedAt: asString(raw.updatedAt, createdAt),
  }

  return { ok: true, project }
}
