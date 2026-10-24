import { shiftWorkingDays } from './calendar'
import { toDateKey, today } from './dates'
import { newId } from './id'
import {
  DEFAULT_CALENDAR,
  SDLC_STAGES,
} from './types'
import type {
  Member,
  NewTaskInput,
  Priority,
  Project,
  ProjectInput,
  StageId,
  Task,
  TaskStatus,
} from './types'

export function makeProject(input: ProjectInput): Project {
  const timestamp = new Date().toISOString()
  return {
    id: newId('prj'),
    name: input.name.trim(),
    organization: input.organization.trim(),
    description: input.description.trim(),
    startDate: input.startDate,
    tasks: [],
    members: [],
    calendar: { ...DEFAULT_CALENDAR, holidays: [] },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function makeTask(projectId: string, input: NewTaskInput): Task {
  void projectId
  return {
    id: newId('tsk'),
    name: input.name.trim(),
    stage: input.stage,
    startDate: input.startDate,
    durationDays: Math.max(1, Math.floor(input.durationDays) || 1),
    priority: input.priority,
    status: input.status,
    color: input.color,
    assigneeId: input.assigneeId,
    notes: input.notes.trim(),
    dependencies: input.dependencies.map((dependency) => ({
      ...dependency,
      id: newId('dep'),
    })),
    createdAt: new Date().toISOString(),
  }
}

export function makeMember(input: Omit<Member, 'id'>): Member {
  return { ...input, id: newId('mbr') }
}

export function cloneProject(project: Project, nameSuffix = ' (salinan)'): Project {
  const memberIdMap = new Map<string, string>()
  const taskIdMap = new Map<string, string>()

  const members = project.members.map((member) => {
    const id = newId('mbr')
    memberIdMap.set(member.id, id)
    return { ...member, id }
  })

  const tasks = project.tasks.map((task) => {
    const id = newId('tsk')
    taskIdMap.set(task.id, id)
    return { ...task, id }
  })

  const remappedTasks = tasks.map((task, index) => {
    const original = project.tasks[index]
    return {
      ...task,
      assigneeId: task.assigneeId ? (memberIdMap.get(task.assigneeId) ?? null) : null,
      dependencies: original.dependencies.flatMap((dependency) => {
        const predecessorId = taskIdMap.get(dependency.predecessorId)
        if (!predecessorId) return []
        return [{ ...dependency, id: newId('dep'), predecessorId }]
      }),
    }
  })

  return {
    ...project,
    id: newId('prj'),
    name: `${project.name}${nameSuffix}`,
    members,
    tasks: remappedTasks,
    calendar: {
      workDays: [...project.calendar.workDays],
      holidays: project.calendar.holidays.map((holiday) => ({ ...holiday })),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

interface SampleTaskSpec {
  name: string
  stage: StageId
  duration: number
  priority: Priority
  status: TaskStatus
  color: string
  assignee: number
  /** Indeks tugas pendahulu dan jenis dependensinya. */
  dependencies?: Array<{ index: number; type: 'FS' | 'SS'; lag?: number }>
  /** Offset hari kerja untuk tugas tanpa dependensi. */
  startOffset?: number
  notes?: string
}

export function createSampleProject(): Project {
  const now = today()
  const anchorOffset = -18
  const calendar = { ...DEFAULT_CALENDAR, holidays: [] }

  const memberSpecs: Array<Omit<Member, 'id'>> = [
    {
      name: 'Andi Pratama',
      email: 'andi.pratama@nusantara.id',
      role: 'Manajer Proyek',
      color: '#3a67f5',
    },
    {
      name: 'Sari Wulandari',
      email: 'sari.wulandari@nusantara.id',
      role: 'Analis Sistem',
      color: '#7c3aed',
    },
    {
      name: 'Budi Santoso',
      email: 'budi.santoso@nusantara.id',
      role: 'UI/UX Designer',
      color: '#0891b2',
    },
    {
      name: 'Rina Kartika',
      email: 'rina.kartika@nusantara.id',
      role: 'Software Engineer',
      color: '#059669',
    },
    {
      name: 'Dimas Saputra',
      email: 'dimas.saputra@nusantara.id',
      role: 'QA Engineer',
      color: '#ca8a04',
    },
  ]
  const members = memberSpecs.map(makeMember)

  const specs: SampleTaskSpec[] = [
    {
      name: 'Wawancara & observasi pengguna',
      stage: 'requirement',
      duration: 3,
      priority: 'high',
      status: 'done',
      color: '#3a67f5',
      assignee: 1,
      startOffset: anchorOffset,
      notes: 'Wawancara kasir dan supervisor di tiga cabang.',
    },
    {
      name: 'Penyusunan dokumen kebutuhan (SRS)',
      stage: 'requirement',
      duration: 4,
      priority: 'high',
      status: 'done',
      color: '#3a67f5',
      assignee: 1,
      dependencies: [{ index: 0, type: 'FS' }],
    },
    {
      name: 'Validasi kebutuhan dengan pemangku kepentingan',
      stage: 'requirement',
      duration: 2,
      priority: 'medium',
      status: 'done',
      color: '#5e8dff',
      assignee: 0,
      dependencies: [{ index: 1, type: 'FS' }],
    },
    {
      name: 'Pemetaan proses bisnis saat ini',
      stage: 'system',
      duration: 5,
      priority: 'high',
      status: 'done',
      color: '#7c3aed',
      assignee: 1,
      startOffset: anchorOffset,
    },
    {
      name: 'Perancangan arsitektur sistem',
      stage: 'system',
      duration: 4,
      priority: 'high',
      status: 'done',
      color: '#7c3aed',
      assignee: 1,
      dependencies: [{ index: 3, type: 'FS' }],
    },
    {
      name: 'Spesifikasi API & integrasi pembayaran',
      stage: 'system',
      duration: 3,
      priority: 'high',
      status: 'done',
      color: '#9333ea',
      assignee: 3,
      dependencies: [{ index: 4, type: 'FS', lag: 1 }],
    },
    {
      name: 'Wireframe & prototipe antarmuka',
      stage: 'design',
      duration: 5,
      priority: 'high',
      status: 'done',
      color: '#0891b2',
      assignee: 2,
      dependencies: [{ index: 2, type: 'FS' }],
    },
    {
      name: 'Desain basis data & ERD',
      stage: 'design',
      duration: 3,
      priority: 'high',
      status: 'done',
      color: '#0e7490',
      assignee: 3,
      dependencies: [{ index: 4, type: 'FS' }],
    },
    {
      name: 'Design system & komponen UI',
      stage: 'design',
      duration: 3,
      priority: 'medium',
      status: 'done',
      color: '#06b6d4',
      assignee: 2,
      dependencies: [{ index: 6, type: 'SS', lag: 2 }],
    },
    {
      name: 'Setup repositori & pipeline CI',
      stage: 'implementation',
      duration: 2,
      priority: 'high',
      status: 'done',
      color: '#059669',
      assignee: 3,
      dependencies: [{ index: 5, type: 'FS' }],
    },
    {
      name: 'Implementasi modul autentikasi & pengguna',
      stage: 'implementation',
      duration: 5,
      priority: 'high',
      status: 'in_progress',
      color: '#059669',
      assignee: 3,
      dependencies: [{ index: 9, type: 'FS' }],
      notes: 'Termasuk peran kasir, supervisor, dan admin cabang.',
    },
    {
      name: 'Implementasi modul transaksi & laporan',
      stage: 'implementation',
      duration: 7,
      priority: 'high',
      status: 'todo',
      color: '#16a34a',
      assignee: 3,
      dependencies: [{ index: 10, type: 'FS', lag: 1 }],
    },
    {
      name: 'Integrasi antarmuka dengan API',
      stage: 'implementation',
      duration: 6,
      priority: 'high',
      status: 'in_progress',
      color: '#10b981',
      assignee: 2,
      dependencies: [{ index: 8, type: 'FS' }],
    },
    {
      name: 'Penyusunan test case & skenario',
      stage: 'testing',
      duration: 4,
      priority: 'medium',
      status: 'in_progress',
      color: '#d97706',
      assignee: 4,
      dependencies: [{ index: 10, type: 'SS' }],
    },
    {
      name: 'Pengujian fungsional & regresi',
      stage: 'testing',
      duration: 5,
      priority: 'high',
      status: 'todo',
      color: '#f59e0b',
      assignee: 4,
      dependencies: [
        { index: 12, type: 'FS' },
        { index: 13, type: 'FS' },
      ],
    },
    {
      name: 'UAT bersama pengguna',
      stage: 'testing',
      duration: 3,
      priority: 'high',
      status: 'todo',
      color: '#ca8a04',
      assignee: 0,
      dependencies: [{ index: 14, type: 'FS', lag: 1 }],
    },
    {
      name: 'Persiapan rilis & dokumentasi',
      stage: 'deployment',
      duration: 3,
      priority: 'medium',
      status: 'todo',
      color: '#e11d48',
      assignee: 0,
      dependencies: [{ index: 15, type: 'FS' }],
    },
    {
      name: 'Deployment ke server produksi',
      stage: 'deployment',
      duration: 2,
      priority: 'urgent',
      status: 'todo',
      color: '#e11d48',
      assignee: 3,
      dependencies: [{ index: 16, type: 'FS' }],
    },
    {
      name: 'Pelatihan pengguna & staf toko',
      stage: 'deployment',
      duration: 2,
      priority: 'medium',
      status: 'todo',
      color: '#f43f5e',
      assignee: 0,
      dependencies: [{ index: 17, type: 'SS', lag: 1 }],
    },
    {
      name: 'Monitoring & pemeliharaan awal',
      stage: 'deployment',
      duration: 5,
      priority: 'medium',
      status: 'todo',
      color: '#fb7185',
      assignee: 3,
      dependencies: [{ index: 17, type: 'FS' }],
    },
  ]

  const taskIds: string[] = specs.map(() => newId('tsk'))
  const tasks: Task[] = specs.map((spec, index) => {
    const start = shiftWorkingDays(
      calendar,
      now,
      spec.startOffset ?? anchorOffset,
    )
    return {
      id: taskIds[index],
      name: spec.name,
      stage: spec.stage,
      startDate: toDateKey(start),
      durationDays: spec.duration,
      priority: spec.priority,
      status: spec.status,
      color: spec.color,
      assigneeId: spec.assignee !== undefined ? members[spec.assignee].id : null,
      notes: spec.notes ?? '',
      dependencies: (spec.dependencies ?? []).map((dependency) => ({
        id: newId('dep'),
        predecessorId: taskIds[dependency.index],
        type: dependency.type,
        lagDays: dependency.lag ?? 0,
      })),
      createdAt: new Date().toISOString(),
    }
  })

  const timestamp = new Date().toISOString()
  return {
    id: newId('prj'),
    name: 'Aplikasi Kasir Nusantara',
    organization: 'PT Nusantara Retail',
    description:
      'Pengembangan aplikasi kasir berbasis web untuk 12 cabang toko ritel, mencakup transaksi, stok, dan laporan penjualan.',
    startDate: toDateKey(shiftWorkingDays(calendar, now, anchorOffset)),
    tasks,
    members,
    calendar: {
      workDays: [1, 2, 3, 4, 5],
      holidays: [
        {
          id: newId('hld'),
          date: toDateKey(shiftWorkingDays(calendar, now, 9)),
          name: 'Libur perusahaan',
        },
      ],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function emptyProjectInput(): ProjectInput {
  return {
    name: '',
    organization: '',
    description: '',
    startDate: toDateKey(today()),
  }
}

export function stageOrder(stage: StageId): number {
  return SDLC_STAGES.findIndex((item) => item.id === stage)
}
