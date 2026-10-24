import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CalendarClock,
  Circle,
  CircleDot,
  CheckCircle2,
  Link2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatDateID, parseDateKey, today, toDateKey } from '../../lib/dates'
import { isWorkingDay, normalizeToWorkingDay } from '../../lib/calendar'
import { computeSchedule, wouldCreateCycle } from '../../lib/schedule'
import {
  getStage,
  PRIORITIES,
  SDLC_STAGES,
  TASK_COLORS,
  TASK_STATUSES,
} from '../../lib/types'
import type {
  DependencyType,
  NewTaskInput,
  Priority,
  Project,
  StageId,
  Task,
  TaskStatus,
} from '../../lib/types'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Drawer } from '../ui/Drawer'
import { Field, Input, Select, Textarea } from '../ui/Form'

interface TaskDrawerProps {
  open: boolean
  onClose: () => void
  project: Project
  task?: Task
  onSave: (values: NewTaskInput) => void
  onDelete: (taskId: string) => void
}

interface DraftDependency {
  predecessorId: string
  type: DependencyType
  lagDays: string
}

interface DraftTask {
  name: string
  stage: StageId
  startDate: string
  durationDays: string
  priority: Priority
  status: TaskStatus
  color: string
  assigneeId: string
  notes: string
  dependencies: DraftDependency[]
}

function initialDraft(project: Project, task?: Task): DraftTask {
  if (task) {
    return {
      name: task.name,
      stage: task.stage,
      startDate: task.startDate,
      durationDays: String(task.durationDays),
      priority: task.priority,
      status: task.status,
      color: task.color,
      assigneeId: task.assigneeId ?? '',
      notes: task.notes,
      dependencies: task.dependencies.map((dependency) => ({
        predecessorId: dependency.predecessorId,
        type: dependency.type,
        lagDays: String(dependency.lagDays),
      })),
    }
  }
  return {
    name: '',
    stage: 'requirement',
    startDate: toDateKey(normalizeToWorkingDay(project.calendar, today())),
    durationDays: '3',
    priority: 'medium',
    status: 'todo',
    color: SDLC_STAGES[0].color,
    assigneeId: '',
    notes: '',
    dependencies: [],
  }
}

const statusIcons = {
  todo: Circle,
  in_progress: CircleDot,
  done: CheckCircle2,
} as const

export function TaskDrawer({
  open,
  onClose,
  project,
  task,
  onSave,
  onDelete,
}: TaskDrawerProps) {
  const [draft, setDraft] = useState<DraftTask>(() => initialDraft(project, task))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [depPredecessor, setDepPredecessor] = useState('')
  const [depType, setDepType] = useState<DependencyType>('FS')
  const [depLag, setDepLag] = useState('0')
  const [depError, setDepError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(initialDraft(project, task))
    setErrors({})
    setDepPredecessor('')
    setDepType('FS')
    setDepLag('0')
    setDepError('')
    setConfirmDelete(false)
  }, [open, task, project])

  const availablePredecessors = useMemo(
    () =>
      project.tasks.filter(
        (item) =>
          item.id !== task?.id &&
          !draft.dependencies.some((dependency) => dependency.predecessorId === item.id),
      ),
    [project.tasks, task?.id, draft.dependencies],
  )

  const preview = useMemo(() => {
    const duration = Math.max(1, Number(draft.durationDays) || 1)
    const draftTask: Task = {
      id: task?.id ?? '__preview_task__',
      name: draft.name || 'Tugas baru',
      stage: draft.stage,
      startDate: draft.startDate,
      durationDays: duration,
      priority: draft.priority,
      status: draft.status,
      color: draft.color,
      assigneeId: draft.assigneeId || null,
      notes: draft.notes,
      dependencies: draft.dependencies.map((dependency, index) => ({
        id: `draft_dep_${index}`,
        predecessorId: dependency.predecessorId,
        type: dependency.type,
        lagDays: Math.max(0, Number(dependency.lagDays) || 0),
      })),
      createdAt: task?.createdAt ?? new Date().toISOString(),
    }
    const tasks = task
      ? project.tasks.map((item) => (item.id === task.id ? draftTask : item))
      : [...project.tasks, draftTask]
    const schedule = computeSchedule({ ...project, tasks })
    const entry = schedule.byId[draftTask.id]
    return {
      entry,
      cycle: schedule.cycleTaskIds.includes(draftTask.id),
    }
  }, [project, task, draft])

  const handleAddDependency = () => {
    setDepError('')
    if (!depPredecessor) {
      setDepError('Pilih tugas pendahulu terlebih dahulu.')
      return
    }
    if (draft.dependencies.some((item) => item.predecessorId === depPredecessor)) {
      setDepError('Tugas tersebut sudah menjadi dependensi.')
      return
    }
    if (task) {
      const tasksWithDraft = project.tasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              dependencies: draft.dependencies.map((dependency, index) => ({
                id: `draft_${index}`,
                predecessorId: dependency.predecessorId,
                type: dependency.type,
                lagDays: Math.max(0, Number(dependency.lagDays) || 0),
              })),
            }
          : item,
      )
      if (wouldCreateCycle(tasksWithDraft, task.id, depPredecessor)) {
        setDepError('Dependensi ini akan membentuk lingkaran. Pilih tugas lain.')
        return
      }
    }
    setDraft((current) => ({
      ...current,
      dependencies: [
        ...current.dependencies,
        { predecessorId: depPredecessor, type: depType, lagDays: depLag || '0' },
      ],
    }))
    setDepPredecessor('')
    setDepType('FS')
    setDepLag('0')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!draft.name.trim()) nextErrors.name = 'Nama kegiatan wajib diisi.'
    if (!draft.startDate) nextErrors.startDate = 'Tanggal mulai wajib diisi.'
    const duration = Number(draft.durationDays)
    if (!Number.isFinite(duration) || duration < 1) {
      nextErrors.duration = 'Durasi minimal 1 hari kerja.'
    }
    if (preview.cycle) {
      nextErrors.dependencies = 'Perbaiki dependensi yang membentuk lingkaran sebelum menyimpan.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSave({
      name: draft.name.trim(),
      stage: draft.stage,
      startDate: draft.startDate,
      durationDays: Math.max(1, Math.floor(duration)),
      priority: draft.priority,
      status: draft.status,
      color: draft.color,
      assigneeId: draft.assigneeId || null,
      notes: draft.notes.trim(),
      dependencies: draft.dependencies.map((dependency) => ({
        predecessorId: dependency.predecessorId,
        type: dependency.type,
        lagDays: Math.max(0, Number(dependency.lagDays) || 0),
      })),
    })
  }

  const stageMeta = getStage(draft.stage)
  const entry = preview.entry
  const hasDependencies = draft.dependencies.length > 0

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={task ? 'Ubah tugas' : 'Tugas baru'}
        description={
          task
            ? 'Perbarui detail kegiatan, jadwal, status, atau penanggung jawab.'
            : 'Lengkapi detail kegiatan. Durasi dihitung dalam hari kerja sesuai kalender proyek.'
        }
        footer={
          <>
            {task ? (
              <Button
                variant="ghost"
                size="sm"
                className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button size="sm" type="submit" form="task-form">
              {task ? 'Simpan perubahan' : 'Tambah tugas'}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-700">
                1
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Informasi kegiatan
              </h3>
            </div>

            <Field
              label="Nama kegiatan"
              htmlFor="task-name"
              required
              error={errors.name}
            >
              <Input
                id="task-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Contoh: Penyusunan dokumen kebutuhan"
                autoFocus
                invalid={Boolean(errors.name)}
              />
            </Field>

            <Field
              label="Tahapan SDLC"
              htmlFor="task-stage"
              hint={stageMeta.description}
            >
              <Select
                id="task-stage"
                value={draft.stage}
                onChange={(event) => {
                  const stage = event.target.value as StageId
                  setDraft((current) => ({
                    ...current,
                    stage,
                    color: task ? current.color : getStage(stage).color,
                  }))
                }}
              >
                {SDLC_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Catatan" htmlFor="task-notes" hint="Opsional">
              <Textarea
                id="task-notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                placeholder="Lingkup pekerjaan, tautan referensi, atau catatan penting..."
                rows={2}
              />
            </Field>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-700">
                2
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Jadwal & durasi
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal mulai" htmlFor="task-start" required error={errors.startDate}>
                <Input
                  id="task-start"
                  type="date"
                  value={draft.startDate}
                  onChange={(event) =>
                    setDraft({ ...draft, startDate: event.target.value })
                  }
                  invalid={Boolean(errors.startDate)}
                />
              </Field>
              <Field
                label="Durasi"
                htmlFor="task-duration"
                hint="Hari kerja"
                error={errors.duration}
                required
              >
                <div className="relative">
                  <Input
                    id="task-duration"
                    type="number"
                    min={1}
                    step={1}
                    value={draft.durationDays}
                    onChange={(event) =>
                      setDraft({ ...draft, durationDays: event.target.value })
                    }
                    invalid={Boolean(errors.duration)}
                    className="pr-14"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400">
                    hari
                  </span>
                </div>
              </Field>
            </div>

            {hasDependencies ? (
              <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Tugas ini memiliki dependensi. Tanggal mulai aktual dihitung otomatis
                dari tugas pendahulu; tanggal mulai di atas hanya menjadi acuan bila
                semua dependensi dilepas.
              </p>
            ) : null}

            {entry ? (
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                  <CalendarClock className="h-3 w-3" /> Pratinjau jadwal
                </p>
                <p className="mt-1.5 text-sm font-bold text-slate-800">
                  {formatDateID(entry.start)} → {formatDateID(entry.end)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {entry.durationDays} hari kerja
                  {entry.constrainedByDependency
                    ? ' · tanggal mulai mengikuti dependensi'
                    : draft.startDate &&
                        !isWorkingDay(project.calendar, parseDateKey(draft.startDate))
                      ? ' · tanggal acuan bukan hari kerja, digeser ke hari kerja berikutnya'
                      : ''}
                </p>
                {preview.cycle ? (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-600">
                    Dependensi membentuk lingkaran. Perbaiki sebelum menyimpan.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-700">
                3
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Klasifikasi & penanggung jawab
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prioritas" htmlFor="task-priority">
                <Select
                  id="task-priority"
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft({ ...draft, priority: event.target.value as Priority })
                  }
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Penanggung jawab" htmlFor="task-assignee">
                <Select
                  id="task-assignee"
                  value={draft.assigneeId}
                  onChange={(event) =>
                    setDraft({ ...draft, assigneeId: event.target.value })
                  }
                >
                  <option value="">Belum ditetapkan</option>
                  {project.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                      {member.role ? ` — ${member.role}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Status pengerjaan">
              <div className="grid grid-cols-3 gap-1.5">
                {TASK_STATUSES.map((status) => {
                  const Icon = statusIcons[status.id]
                  const active = draft.status === status.id
                  return (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, status: status.id })}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-semibold transition',
                        active
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                      )}
                      aria-pressed={active}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: status.color }} />
                      {status.label}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Warna kegiatan">
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {TASK_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, color: color.value })}
                    className={cn(
                      'h-7 w-7 rounded-full ring-2 ring-offset-2 transition',
                      draft.color === color.value
                        ? 'ring-slate-800'
                        : 'ring-transparent hover:ring-slate-300',
                    )}
                    style={{ backgroundColor: color.value }}
                    aria-label={color.name}
                    aria-pressed={draft.color === color.value}
                  />
                ))}
              </div>
            </Field>

            {draft.assigneeId ? (
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Avatar
                  member={project.members.find((item) => item.id === draft.assigneeId)}
                  size="xs"
                />
                {project.members.find((item) => item.id === draft.assigneeId)?.name}
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-700">
                4
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Dependensi antar-tugas
              </h3>
            </div>

            {draft.dependencies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                Belum ada dependensi. Tugas akan mulai sesuai tanggal acuan.
              </p>
            ) : (
              <ul className="space-y-2">
                {draft.dependencies.map((dependency) => {
                  const predecessor = project.tasks.find(
                    (item) => item.id === dependency.predecessorId,
                  )
                  return (
                    <li
                      key={dependency.predecessorId}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-slate-700">
                            {predecessor?.name ?? 'Tugas tidak ditemukan'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {getStage(predecessor?.stage ?? 'requirement').shortLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              dependencies: draft.dependencies.filter(
                                (item) => item.predecessorId !== dependency.predecessorId,
                              ),
                            })
                          }
                          className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Hapus dependensi"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2 pl-5">
                        <label className="text-[10px] font-medium text-slate-400">
                          Jenis
                          <select
                            value={dependency.type}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                dependencies: draft.dependencies.map((item) =>
                                  item.predecessorId === dependency.predecessorId
                                    ? {
                                        ...item,
                                        type: event.target.value as DependencyType,
                                      }
                                    : item,
                                ),
                              })
                            }
                            className="mt-1 h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-[11px] text-slate-700 focus:border-brand-500 focus:outline-none"
                          >
                            <option value="FS">FS · selesai → mulai</option>
                            <option value="SS">SS · mulai → mulai</option>
                          </select>
                        </label>
                        <label className="text-[10px] font-medium text-slate-400">
                          Jeda (hari kerja)
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={dependency.lagDays}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                dependencies: draft.dependencies.map((item) =>
                                  item.predecessorId === dependency.predecessorId
                                    ? { ...item, lagDays: event.target.value }
                                    : item,
                                ),
                              })
                            }
                            className="mt-1 h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-[11px] text-slate-700 focus:border-brand-500 focus:outline-none"
                          />
                        </label>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Tambah dependensi
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px]">
                <select
                  value={depPredecessor}
                  onChange={(event) => {
                    setDepPredecessor(event.target.value)
                    setDepError('')
                  }}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[11px] text-slate-700 focus:border-brand-500 focus:outline-none"
                  aria-label="Pilih tugas pendahulu"
                >
                  <option value="">Pilih tugas pendahulu...</option>
                  {SDLC_STAGES.map((stage) => {
                    const items = availablePredecessors.filter(
                      (item) => item.stage === stage.id,
                    )
                    if (items.length === 0) return null
                    return (
                      <optgroup key={stage.id} label={stage.label}>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
                <select
                  value={depType}
                  onChange={(event) => setDepType(event.target.value as DependencyType)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[11px] text-slate-700 focus:border-brand-500 focus:outline-none"
                  aria-label="Jenis dependensi"
                >
                  <option value="FS">FS · selesai → mulai</option>
                  <option value="SS">SS · mulai → mulai</option>
                </select>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <label className="text-[10px] font-medium text-slate-400">
                  Jeda
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={depLag}
                    onChange={(event) => setDepLag(event.target.value)}
                    className="mt-1 h-8 w-20 rounded-lg border border-slate-300 bg-white px-2 text-[11px] text-slate-700 focus:border-brand-500 focus:outline-none"
                    aria-label="Jeda dalam hari kerja"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleAddDependency}
                  disabled={availablePredecessors.length === 0}
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </div>
              {depError ? (
                <p className="mt-1.5 text-[11px] font-medium text-red-600" role="alert">
                  {depError}
                </p>
              ) : null}
              {errors.dependencies ? (
                <p className="mt-1.5 text-[11px] font-medium text-red-600" role="alert">
                  {errors.dependencies}
                </p>
              ) : null}
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                FS: tugas ini mulai setelah pendahulu selesai. SS: mulai bersamaan.
                Jeda 0 berarti hari kerja berikutnya (FS) atau hari yang sama (SS).
              </p>
            </div>
          </section>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (task) onDelete(task.id)
        }}
        title="Hapus tugas ini?"
        description={`Tugas “${task?.name ?? ''}” akan dihapus. Dependensi yang merujuk ke tugas ini juga akan dilepas.`}
        confirmLabel="Ya, hapus tugas"
      />
    </>
  )
}
