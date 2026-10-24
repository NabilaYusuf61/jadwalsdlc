export const SDLC_STAGES = [
  {
    id: 'requirement',
    label: 'Analisis Kebutuhan',
    shortLabel: 'Kebutuhan',
    description: 'Menggali dan mendokumentasikan kebutuhan pengguna.',
    color: '#3a67f5',
  },
  {
    id: 'system',
    label: 'Analisis Sistem',
    shortLabel: 'Analisis Sistem',
    description: 'Memetakan alur sistem dan solusi teknis.',
    color: '#7c3aed',
  },
  {
    id: 'design',
    label: 'Perancangan',
    shortLabel: 'Perancangan',
    description: 'Merancang arsitektur, basis data, dan antarmuka.',
    color: '#0e7490',
  },
  {
    id: 'implementation',
    label: 'Implementasi',
    shortLabel: 'Implementasi',
    description: 'Menulis kode dan membangun fitur.',
    color: '#059669',
  },
  {
    id: 'testing',
    label: 'Pengujian',
    shortLabel: 'Pengujian',
    description: 'Verifikasi kualitas dan perbaikan bug.',
    color: '#d97706',
  },
  {
    id: 'deployment',
    label: 'Deployment & Maintenance',
    shortLabel: 'Deployment',
    description: 'Rilis ke pengguna dan pemeliharaan berkelanjutan.',
    color: '#e11d48',
  },
] as const

export type StageId = (typeof SDLC_STAGES)[number]['id']

export function getStage(id: StageId) {
  return SDLC_STAGES.find((stage) => stage.id === id) ?? SDLC_STAGES[0]
}

export const PRIORITIES = [
  { id: 'low', label: 'Rendah', color: '#64748b', dot: 'bg-slate-400' },
  { id: 'medium', label: 'Sedang', color: '#0e7490', dot: 'bg-cyan-600' },
  { id: 'high', label: 'Tinggi', color: '#d97706', dot: 'bg-amber-500' },
  { id: 'urgent', label: 'Mendesak', color: '#dc2626', dot: 'bg-red-600' },
] as const

export type Priority = (typeof PRIORITIES)[number]['id']

export function getPriority(id: Priority) {
  return PRIORITIES.find((priority) => priority.id === id) ?? PRIORITIES[1]
}

export const TASK_STATUSES = [
  { id: 'todo', label: 'Belum Mulai', color: '#64748b', dot: 'bg-slate-400' },
  { id: 'in_progress', label: 'Berjalan', color: '#2563eb', dot: 'bg-blue-600' },
  { id: 'done', label: 'Selesai', color: '#059669', dot: 'bg-emerald-600' },
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]['id']

export function getTaskStatus(id: TaskStatus) {
  return TASK_STATUSES.find((status) => status.id === id) ?? TASK_STATUSES[0]
}

export const TASK_COLORS = [
  { value: '#3a67f5', name: 'Biru' },
  { value: '#7c3aed', name: 'Ungu' },
  { value: '#0891b2', name: 'Sian' },
  { value: '#059669', name: 'Hijau' },
  { value: '#ca8a04', name: 'Kuning' },
  { value: '#ea580c', name: 'Oranye' },
  { value: '#e11d48', name: 'Merah' },
  { value: '#475569', name: 'Abu-abu' },
] as const

export type DependencyType = 'FS' | 'SS'

export const DEPENDENCY_TYPES: Record<
  DependencyType,
  { label: string; longLabel: string; description: string }
> = {
  FS: {
    label: 'FS',
    longLabel: 'Finish to Start',
    description: 'Tugas ini dimulai setelah tugas pendahulu selesai.',
  },
  SS: {
    label: 'SS',
    longLabel: 'Start to Start',
    description: 'Tugas ini dimulai bersamaan dengan tugas pendahulu.',
  },
}

export interface Dependency {
  id: string
  predecessorId: string
  type: DependencyType
  lagDays: number
}

export interface Task {
  id: string
  name: string
  stage: StageId
  /** Tanggal mulai acuan (YYYY-MM-DD). Diabaikan bila tugas punya dependensi. */
  startDate: string
  /** Durasi dalam hari kerja. */
  durationDays: number
  priority: Priority
  status: TaskStatus
  color: string
  assigneeId: string | null
  dependencies: Dependency[]
  notes: string
  createdAt: string
}

export interface Member {
  id: string
  name: string
  email: string
  role: string
  color: string
}

export interface Holiday {
  id: string
  date: string
  name: string
}

export interface WorkCalendar {
  /** 0 = Minggu ... 6 = Sabtu */
  workDays: number[]
  holidays: Holiday[]
}

export interface Project {
  id: string
  name: string
  organization: string
  description: string
  startDate: string
  tasks: Task[]
  members: Member[]
  calendar: WorkCalendar
  createdAt: string
  updatedAt: string
}

export interface NewTaskInput {
  name: string
  stage: StageId
  startDate: string
  durationDays: number
  priority: Priority
  status: TaskStatus
  color: string
  assigneeId: string | null
  notes: string
  dependencies: Omit<Dependency, 'id'>[]
}

export interface ProjectInput {
  name: string
  organization: string
  description: string
  startDate: string
}

export interface AppSnapshot {
  version: 1
  exportedAt: string
  projects: Project[]
}

export const DEFAULT_CALENDAR: WorkCalendar = {
  workDays: [1, 2, 3, 4, 5],
  holidays: [],
}
