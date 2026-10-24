import { describe, expect, it } from 'vitest'
import { createSampleProject } from './project'
import {
  computeSchedule,
  getProjectStats,
  isOverdue,
  wouldCreateCycle,
} from './schedule'
import { DEFAULT_CALENDAR } from './types'
import type { Dependency, Project, Task, WorkCalendar } from './types'
import { parseDateKey, toDateKey } from './dates'

function task(
  id: string,
  startDate: string,
  durationDays: number,
  dependencies: Dependency[] = [],
  overrides: Partial<Task> = {},
): Task {
  return {
    id,
    name: `Tugas ${id}`,
    stage: 'implementation',
    startDate,
    durationDays,
    priority: 'medium',
    status: 'todo',
    color: '#3a67f5',
    assigneeId: null,
    dependencies,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function dependency(
  predecessorId: string,
  type: 'FS' | 'SS' = 'FS',
  lagDays = 0,
): Dependency {
  return { id: `dep_${predecessorId}_${type}_${lagDays}`, predecessorId, type, lagDays }
}

function project(tasks: Task[], calendar: WorkCalendar = DEFAULT_CALENDAR): Project {
  return {
    id: 'prj_test',
    name: 'Proyek Uji',
    organization: 'Uji',
    description: '',
    startDate: '2026-11-02',
    tasks,
    members: [],
    calendar,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}


describe('computeSchedule', () => {
  it('menghitung FS, SS, dan lag dalam hari kerja', () => {
    const tasks = [
      task('A', '2026-11-02', 3),
      task('B', '2026-11-02', 2, [dependency('A', 'FS', 0)]),
      task('C', '2026-11-02', 1, [dependency('A', 'SS', 2)]),
      task('D', '2026-11-02', 1, [dependency('A', 'FS', 1)]),
      task('E', '2026-11-02', 1, [dependency('B'), dependency('D')]),
    ]
    const schedule = computeSchedule(project(tasks))

    expect(toDateKey(schedule.byId.A.start)).toBe('2026-11-02')
    expect(toDateKey(schedule.byId.A.end)).toBe('2026-11-04')
    expect(toDateKey(schedule.byId.B.start)).toBe('2026-11-05')
    expect(toDateKey(schedule.byId.B.end)).toBe('2026-11-06')
    expect(toDateKey(schedule.byId.C.start)).toBe('2026-11-04')
    expect(toDateKey(schedule.byId.D.start)).toBe('2026-11-06')
    expect(toDateKey(schedule.byId.E.start)).toBe('2026-11-09')
    expect(schedule.cycleTaskIds).toHaveLength(0)
  })

  it('menggeser tanggal mulai melewati akhir pekan dan hari libur', () => {
    const calendar: WorkCalendar = {
      workDays: [1, 2, 3, 4, 5],
      holidays: [{ id: 'h1', date: '2026-11-09', name: 'Libur' }],
    }
    const tasks = [
      task('A', '2026-11-05', 2),
      task('B', '2026-11-05', 1, [dependency('A')]),
      task('C', '2026-11-05', 1, [dependency('A')]),
    ]
    const schedule = computeSchedule(project(tasks, calendar))
    expect(toDateKey(schedule.byId.A.end)).toBe('2026-11-06')
    expect(toDateKey(schedule.byId.B.start)).toBe('2026-11-10')
  })

  it('memilih tanggal mulai terbaru dari beberapa dependensi', () => {
    const tasks = [
      task('A', '2026-11-02', 1),
      task('B', '2026-11-02', 4),
      task('C', '2026-11-02', 1, [dependency('A'), dependency('B')]),
    ]
    const schedule = computeSchedule(project(tasks))
    expect(toDateKey(schedule.byId.C.start)).toBe('2026-11-06')
  })

  it('menormalkan tanggal mulai ke hari kerja berikutnya', () => {
    const tasks = [task('A', '2026-10-31', 2)] // Sabtu
    const schedule = computeSchedule(project(tasks))
    expect(toDateKey(schedule.byId.A.start)).toBe('2026-11-02')
  })

  it('menandai dependensi siklik tanpa menghilangkan tugas', () => {
    const tasks = [
      task('A', '2026-11-02', 1, [dependency('B')]),
      task('B', '2026-11-02', 1, [dependency('A')]),
      task('C', '2026-11-02', 1),
    ]
    const schedule = computeSchedule(project(tasks))
    expect(schedule.cycleTaskIds.sort()).toEqual(['A', 'B'])
    expect(schedule.ordered).toHaveLength(3)
  })

  it('mengabaikan dependensi yang tugas pendahulunya sudah dihapus', () => {
    const tasks = [task('A', '2026-11-02', 1, [dependency('HILANG')])]
    const schedule = computeSchedule(project(tasks))
    expect(schedule.missingDependencyIds).toHaveLength(1)
    expect(toDateKey(schedule.byId.A.start)).toBe('2026-11-02')
  })

  it('data contoh menghasilkan jadwal lengkap tanpa siklus', () => {
    const sample = createSampleProject()
    const schedule = computeSchedule(sample)
    expect(sample.tasks).toHaveLength(20)
    expect(sample.members).toHaveLength(5)
    expect(schedule.cycleTaskIds).toHaveLength(0)
    expect(schedule.ordered).toHaveLength(20)
    expect(schedule.projectStart).not.toBeNull()
    expect(schedule.projectEnd).not.toBeNull()
  })
})

describe('wouldCreateCycle', () => {
  it('mendeteksi dependensi yang membentuk lingkaran', () => {
    const tasks = [
      task('A', '2026-11-02', 1),
      task('B', '2026-11-02', 1, [dependency('A')]),
    ]
    // B sudah bergantung pada A, jadi A -> B akan membentuk siklus.
    expect(wouldCreateCycle(tasks, 'A', 'B')).toBe(true)
    expect(wouldCreateCycle(tasks, 'B', 'A')).toBe(false)
    expect(wouldCreateCycle(tasks, 'A', 'A')).toBe(true)
  })
})

describe('getProjectStats', () => {
  it('meringkas status dan menghitung keterlambatan', () => {
    const tasks = [
      task('A', '2026-11-02', 2, [], { status: 'done' }),
      task('B', '2026-11-02', 2, [], { status: 'in_progress' }),
      task('C', '2026-11-02', 2, [], { status: 'todo' }),
    ]
    const stats = getProjectStats(project(tasks), parseDateKey('2026-11-20'))
    expect(stats.totalTasks).toBe(3)
    expect(stats.done).toBe(1)
    expect(stats.inProgress).toBe(1)
    expect(stats.overdue).toBe(2)
    expect(stats.progress).toBe(33)
  })

  it('menandai tugas selesai sebagai tidak terlambat', () => {
    const schedule = computeSchedule(project([task('A', '2026-11-02', 1)]))
    expect(isOverdue(schedule.byId.A, parseDateKey('2026-11-20'))).toBe(true)
    const doneSchedule = computeSchedule(
      project([task('A', '2026-11-02', 1, [], { status: 'done' })]),
    )
    expect(isOverdue(doneSchedule.byId.A, parseDateKey('2026-11-20'))).toBe(false)
  })
})
