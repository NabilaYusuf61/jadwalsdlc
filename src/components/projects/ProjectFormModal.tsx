import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FolderPlus, PencilLine } from 'lucide-react'
import { todayKey } from '../../lib/dates'
import type { Project, ProjectInput } from '../../lib/types'
import { Button } from '../ui/Button'
import { Field, Input, Textarea } from '../ui/Form'
import { Modal } from '../ui/Modal'

interface ProjectFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: ProjectInput) => void
  project?: Project
}

const emptyValues = (): ProjectInput => ({
  name: '',
  organization: '',
  description: '',
  startDate: todayKey(),
})

export function ProjectFormModal({
  open,
  onClose,
  onSubmit,
  project,
}: ProjectFormModalProps) {
  const [values, setValues] = useState<ProjectInput>(emptyValues)
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({})

  useEffect(() => {
    if (!open) return
    setValues(
      project
        ? {
            name: project.name,
            organization: project.organization,
            description: project.description,
            startDate: project.startDate,
          }
        : emptyValues(),
    )
    setErrors({})
  }, [open, project])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!values.name.trim()) nextErrors.name = 'Nama proyek wajib diisi.'
    if (!values.startDate) nextErrors.startDate = 'Tanggal mulai wajib diisi.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({
      name: values.name.trim(),
      organization: values.organization.trim(),
      description: values.description.trim(),
      startDate: values.startDate,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Ubah informasi proyek' : 'Buat proyek baru'}
      description={
        project
          ? 'Perbarui identitas proyek. Jadwal tugas tidak berubah.'
          : 'Mulai dengan identitas proyek, lalu tambahkan tugas dan anggota tim.'
      }
      icon={project ? <PencilLine className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form="project-form" size="sm">
            {project ? 'Simpan perubahan' : 'Buat proyek'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nama proyek" htmlFor="project-name" required error={errors.name}>
          <Input
            id="project-name"
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            placeholder="Contoh: Aplikasi Kasir Nusantara"
            autoFocus
            invalid={Boolean(errors.name)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Organisasi"
            htmlFor="project-organization"
            hint="Opsional"
          >
            <Input
              id="project-organization"
              value={values.organization}
              onChange={(event) =>
                setValues({ ...values, organization: event.target.value })
              }
              placeholder="Nama instansi atau tim"
            />
          </Field>
          <Field
            label="Tanggal mulai proyek"
            htmlFor="project-start"
            required
            error={errors.startDate}
          >
            <Input
              id="project-start"
              type="date"
              value={values.startDate}
              onChange={(event) =>
                setValues({ ...values, startDate: event.target.value })
              }
              invalid={Boolean(errors.startDate)}
            />
          </Field>
        </div>

        <Field label="Deskripsi" htmlFor="project-description" hint="Opsional">
          <Textarea
            id="project-description"
            value={values.description}
            onChange={(event) =>
              setValues({ ...values, description: event.target.value })
            }
            placeholder="Tujuan proyek, ruang lingkup, atau catatan singkat..."
            rows={3}
          />
        </Field>
      </form>
    </Modal>
  )
}
