import { differenceInCalendarDays, isAfter, startOfDay } from 'date-fns'
import {
  countCalendarDays,
  countWorkingDays,
  endDateForDuration,
  nextWorkingDay,
  normalizeToWorkingDay,
  shiftWorkingDays,
} from './calendar'
import { parseDateKey, today } from './dates'
import { SDLC_STAGES } from './types'
import type { Project, Task } from './types'

export interface ScheduledTask {
  task: Task
  start: Date
  end: Date
  durationDays: number
  constrainedByDependency: boolean
  inCycle: boolean
}

export interface ScheduleResult {
  byId: Record<string, ScheduledTask>
  /** Urutan pengerjaan berdasarkan tanggal mulai, lalu tahapan. */
  ordered: ScheduledTask[]
  projectStart: Date | null
  projectEnd: Date | null
  cycleTaskIds: string[]
  missingDependencyIds: string[]
}

const stageIndex = (task: Task) =>
  SDLC_STAGES.findIndex((stage) => stage.id === task.stage)

function anchorDate(task: Task, project: Project): Date {
  const parsed = parseDateKey(task.startDate)
  const fallback = parseDateKey(project.startDate)
  const base = Number.isNaN(parsed.getTime())
    ? Number.isNaN(fallback.getTime())
      ? today()
      : fallback
    : parsed
  return normalizeToWorkingDay(project.calendar, base)
}

export function computeSchedule(project: Project): ScheduleResult {
  const taskMap = new Map(project.tasks.map((task) => [task.id, task]))
  const scheduleOrder: Task[] = []
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()
  const missingDependencyIds = new Set<string>()

  for (const task of project.tasks) {
    let degree = 0
    for (const dependency of task.dependencies) {
      if (!taskMap.has(dependency.predecessorId) || dependency.predecessorId === task.id) {
        missingDependencyIds.add(dependency.id)
        continue
      }
      degree += 1
      const list = dependents.get(dependency.predecessorId) ?? []
      list.push(task.id)
      dependents.set(dependency.predecessorId, list)
    }
    inDegree.set(task.id, degree)
  }

  // Kahn's algorithm, with a stable stage/date ordering for parallel tasks.
  const ready = project.tasks
    .filter((task) => (inDegree.get(task.id) ?? 0) === 0)
    .sort(
      (a, b) =>
        stageIndex(a) - stageIndex(b) ||
        a.startDate.localeCompare(b.startDate) ||
        a.name.localeCompare(b.name),
    )

  while (ready.length > 0) {
    const task = ready.shift()
    if (!task) break
    scheduleOrder.push(task)
    for (const dependentId of dependents.get(task.id) ?? []) {
      const nextDegree = (inDegree.get(dependentId) ?? 1) - 1
      inDegree.set(dependentId, nextDegree)
      if (nextDegree === 0) {
        const dependent = taskMap.get(dependentId)
        if (dependent) {
          ready.push(dependent)
          ready.sort(
            (a, b) =>
              stageIndex(a) - stageIndex(b) ||
              a.startDate.localeCompare(b.startDate) ||
              a.name.localeCompare(b.name),
          )
        }
      }
    }
  }

  const cycleTaskIds = project.tasks
    .filter((task) => !scheduleOrder.includes(task))
    .map((task) => task.id)

  // Tasks caught in a dependency cycle still get a fallback schedule so the
  // project stays usable; the UI surfaces a warning instead of hiding them.
  const remaining = project.tasks
    .filter((task) => cycleTaskIds.includes(task.id))
    .sort((a, b) => stageIndex(a) - stageIndex(b) || a.startDate.localeCompare(b.startDate))
  scheduleOrder.push(...remaining)

  const byId: Record<string, ScheduledTask> = {}

  for (const task of scheduleOrder) {
    const anchor = anchorDate(task, project)
    const validDependencies = task.dependencies.filter(
      (dependency) =>
        dependency.predecessorId !== task.id &&
        byId[dependency.predecessorId] !== undefined,
    )

    const candidates: Date[] = []
    for (const dependency of validDependencies) {
      const predecessor = byId[dependency.predecessorId]
      if (!predecessor) continue
      const lag = Math.max(0, Math.floor(dependency.lagDays))
      if (dependency.type === 'SS') {
        candidates.push(shiftWorkingDays(project.calendar, predecessor.start, lag))
      } else {
        const base = nextWorkingDay(project.calendar, predecessor.end)
        candidates.push(shiftWorkingDays(project.calendar, base, lag))
      }
    }

    const start =
      candidates.length > 0
        ? candidates.reduce((latest, candidate) =>
            isAfter(candidate, latest) ? candidate : latest,
          )
        : anchor

    const durationDays = Math.max(1, Math.floor(task.durationDays) || 1)
    const end = endDateForDuration(project.calendar, start, durationDays)

    byId[task.id] = {
      task,
      start,
      end,
      durationDays: countWorkingDays(project.calendar, start, end),
      constrainedByDependency: candidates.length > 0,
      inCycle: cycleTaskIds.includes(task.id),
    }
  }

  const ordered = project.tasks
    .map((task) => byId[task.id])
    .filter((entry): entry is ScheduledTask => Boolean(entry))
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        stageIndex(a.task) - stageIndex(b.task) ||
        a.task.name.localeCompare(b.task.name),
    )

  const starts = ordered.map((entry) => entry.start)
  const ends = ordered.map((entry) => entry.end)
  const projectStart =
    starts.length > 0 ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null
  const projectEnd =
    ends.length > 0 ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null

  return {
    byId,
    ordered,
    projectStart,
    projectEnd,
    cycleTaskIds,
    missingDependencyIds: [...missingDependencyIds],
  }
}

export function getCalendarSpanDays(entry: ScheduledTask): number {
  return countCalendarDays(entry.start, entry.end)
}

export function isOverdue(
  entry: ScheduledTask,
  reference: Date = today(),
): boolean {
  return entry.task.status !== 'done' && differenceInCalendarDays(reference, entry.end) > 0
}

export function getDependentTasks(tasks: Task[], taskId: string): Task[] {
  return tasks.filter((task) =>
    task.dependencies.some((dependency) => dependency.predecessorId === taskId),
  )
}

/** Apakah menambahkan predecessorId -> taskId akan membentuk siklus? */
export function wouldCreateCycle(
  tasks: Task[],
  taskId: string,
  predecessorId: string,
): boolean {
  if (taskId === predecessorId) return true
  const successors = new Map<string, string[]>()
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      const list = successors.get(dependency.predecessorId) ?? []
      list.push(task.id)
      successors.set(dependency.predecessorId, list)
    }
  }
  const stack = [taskId]
  const visited = new Set<string>()
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    if (current === predecessorId) return true
    if (visited.has(current)) continue
    visited.add(current)
    stack.push(...(successors.get(current) ?? []))
  }
  return false
}

export interface ProjectStats {
  totalTasks: number
  done: number
  inProgress: number
  todo: number
  overdue: number
  progress: number
  projectStart: Date | null
  projectEnd: Date | null
}

export function getProjectStats(
  project: Project,
  reference: Date = startOfDay(new Date()),
): ProjectStats {
  const schedule = computeSchedule(project)
  const totalTasks = project.tasks.length
  const done = project.tasks.filter((task) => task.status === 'done').length
  const inProgress = project.tasks.filter((task) => task.status === 'in_progress').length
  const todo = totalTasks - done - inProgress
  const overdue = schedule.ordered.filter((entry) => isOverdue(entry, reference)).length
  return {
    totalTasks,
    done,
    inProgress,
    todo,
    overdue,
    progress: totalTasks === 0 ? 0 : Math.round((done / totalTasks) * 100),
    projectStart: schedule.projectStart,
    projectEnd: schedule.projectEnd,
  }
}

export function getAuthorizedStartPreview(
  project: Project,
  task: Task,
  draftStartDate: string,
): { start: Date; end: Date; constrained: boolean } {
  const draftProject: Project = {
    ...project,
    tasks: project.tasks.map((item) =>
      item.id === task.id ? { ...item, startDate: draftStartDate } : item,
    ),
  }
  const schedule = computeSchedule(draftProject)
  const own = schedule.byId[task.id]
  const fallback = normalizeToWorkingDay(
    project.calendar,
    parseDateKey(draftStartDate),
  )
  return own
    ? { start: own.start, end: own.end, constrained: own.constrainedByDependency }
    : {
        start: fallback,
        end: endDateForDuration(project.calendar, fallback, task.durationDays),
        constrained: false,
      }
}
