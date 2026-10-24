import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Mail, Pencil, Plus, Trash2, UserPlus, Users, UserRound } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { ActionMenu } from '../ui/ActionMenu'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { Field, Input } from '../ui/Form'
import { Modal } from '../ui/Modal'
import { getTaskStatus, TASK_COLORS } from '../../lib/types'
import type { Member, Project } from '../../lib/types'
import { useAppStore } from '../../store/useAppStore'

interface TeamViewProps {
  project: Project
}

interface MemberFormValues {
  name: string
  email: string
  role: string
  color: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function TeamView({ project }: TeamViewProps) {
  const addMember = useAppStore((state) => state.addMember)
  const updateMember = useAppStore((state) => state.updateMember)
  const deleteMember = useAppStore((state) => state.deleteMember)

  const [formOpen, setFormOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)

  const tasksByMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const task of project.tasks) {
      if (!task.assigneeId) continue
      map.set(task.assigneeId, (map.get(task.assigneeId) ?? 0) + 1)
    }
    return map
  }, [project.tasks])

  const openAdd = () => {
    setEditingMember(undefined)
    setFormOpen(true)
  }

  const openEdit = (member: Member) => {
    setEditingMember(member)
    setFormOpen(true)
  }

  const handleSubmit = (values: MemberFormValues) => {
    if (editingMember) {
      updateMember(project.id, editingMember.id, values)
    } else {
      addMember(project.id, values)
    }
    setFormOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Anggota tim</h2>
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-slate-500">
              Tambahkan nama, email, dan peran setiap anggota. Tetapkan penanggung jawab
              saat membuat atau mengubah tugas.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd} className="self-start sm:self-center">
          <UserPlus className="h-3.5 w-3.5" /> Tambah anggota
        </Button>
      </div>

      {project.members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="Tim belum terbentuk"
          description="Tambahkan anggota pertama agar setiap tugas memiliki penanggung jawab yang jelas."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Tambah anggota pertama
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {project.members.map((member) => {
            const assigned = project.tasks.filter(
              (task) => task.assigneeId === member.id,
            )
            const count = tasksByMember.get(member.id) ?? 0
            return (
              <article
                key={member.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar member={member} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-slate-900">
                      {member.name}
                    </h3>
                    <p className="truncate text-[11px] font-medium text-slate-500">
                      {member.role || 'Anggota tim'}
                    </p>
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-400 transition hover:text-brand-600"
                        title={member.email}
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    ) : null}
                  </div>
                  <ActionMenu
                    label={`Aksi untuk ${member.name}`}
                    items={[
                      { label: 'Ubah anggota', icon: Pencil, onSelect: () => openEdit(member) },
                      {
                        label: 'Hapus anggota',
                        icon: Trash2,
                        onSelect: () => setDeleteTarget(member),
                        tone: 'danger',
                      },
                    ]}
                  />
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Tugas ditugaskan
                    </span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                      {count}
                    </span>
                  </div>
                  {assigned.length === 0 ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <UserRound className="h-3 w-3" /> Belum ada tugas
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {assigned.slice(0, 3).map((task) => {
                        const status = getTaskStatus(task.status)
                        return (
                          <li
                            key={task.id}
                            className="flex items-center gap-1.5 text-[11px] text-slate-600"
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: task.color }}
                            />
                            <span className="truncate">{task.name}</span>
                            <span
                              className="ml-auto shrink-0 text-[9px] font-semibold"
                              style={{ color: status.color }}
                            >
                              {status.label}
                            </span>
                          </li>
                        )
                      })}
                      {assigned.length > 3 ? (
                        <li className="text-[10px] font-medium text-slate-400">
                          +{assigned.length - 3} tugas lainnya
                        </li>
                      ) : null}
                    </ul>
                  )}
                </div>
              </article>
            )
          })}

          <button
            type="button"
            onClick={openAdd}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-slate-400 transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-600"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold">Tambah anggota baru</span>
          </button>
        </div>
      )}

      <MemberFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        member={editingMember}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMember(project.id, deleteTarget.id)
        }}
        title="Hapus anggota tim?"
        description={`${deleteTarget?.name ?? 'Anggota ini'} akan dihapus dari tim. Tugas yang sebelumnya ditugaskan akan menjadi tanpa penanggung jawab, tetapi tidak dihapus.`}
        confirmLabel="Ya, hapus anggota"
      />
    </div>
  )
}

interface MemberFormModalProps {
  open: boolean
  onClose: () => void
  member?: Member
  onSubmit: (values: MemberFormValues) => void
}

function MemberFormModal({ open, onClose, member, onSubmit }: MemberFormModalProps) {
  const [values, setValues] = useState<MemberFormValues>({
    name: '',
    email: '',
    role: '',
    color: TASK_COLORS[0].value,
  })
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  useEffect(() => {
    if (!open) return
    setValues(
      member
        ? {
            name: member.name,
            email: member.email,
            role: member.role,
            color: member.color,
          }
        : {
            name: '',
            email: '',
            role: '',
            color: TASK_COLORS[0].value,
          },
    )
    setErrors({})
  }, [open, member])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!values.name.trim()) nextErrors.name = 'Nama anggota wajib diisi.'
    if (values.email.trim() && !emailPattern.test(values.email.trim())) {
      nextErrors.email = 'Format email tidak valid.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role.trim(),
      color: values.color,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? 'Ubah anggota tim' : 'Tambah anggota tim'}
      description="Informasi ini membantu tim mengetahui peran dan kontak setiap anggota."
      icon={<UserPlus className="h-4 w-4" />}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button size="sm" type="submit" form="member-form">
            {member ? 'Simpan perubahan' : 'Tambah anggota'}
          </Button>
        </>
      }
    >
      <form id="member-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nama lengkap" htmlFor="member-name" required error={errors.name}>
          <Input
            id="member-name"
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            placeholder="Contoh: Sari Wulandari"
            autoFocus
            invalid={Boolean(errors.name)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Email"
            htmlFor="member-email"
            hint="Opsional"
            error={errors.email}
          >
            <Input
              id="member-email"
              type="email"
              value={values.email}
              onChange={(event) => setValues({ ...values, email: event.target.value })}
              placeholder="nama@perusahaan.id"
              invalid={Boolean(errors.email)}
            />
          </Field>
          <Field label="Peran" htmlFor="member-role" hint="Opsional">
            <Input
              id="member-role"
              value={values.role}
              onChange={(event) => setValues({ ...values, role: event.target.value })}
              placeholder="Contoh: Analis Sistem"
            />
          </Field>
        </div>
        <Field label="Warna avatar">
          <div className="flex flex-wrap gap-2 pt-1">
            {TASK_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setValues({ ...values, color: color.value })}
                className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition ${
                  values.color === color.value
                    ? 'ring-slate-800'
                    : 'ring-transparent hover:ring-slate-300'
                }`}
                style={{ backgroundColor: color.value }}
                aria-label={color.name}
                aria-pressed={values.color === color.value}
              />
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  )
}
