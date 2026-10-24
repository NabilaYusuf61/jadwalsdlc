import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  Database,
  Download,
  FileJson,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Field, Input, Textarea } from '../ui/Form'
import { downloadProjectJson } from '../../lib/download'
import { parseProjectJson } from '../../lib/importProject'
import type { Project } from '../../lib/types'
import { useAppStore } from '../../store/useAppStore'

interface SettingsViewProps {
  project: Project
  onDeleted: () => void
}

export function SettingsView({ project, onDeleted }: SettingsViewProps) {
  const updateProject = useAppStore((state) => state.updateProject)
  const deleteProject = useAppStore((state) => state.deleteProject)
  const importProject = useAppStore((state) => state.importProject)

  const [values, setValues] = useState({
    name: project.name,
    organization: project.organization,
    startDate: project.startDate,
    description: project.description,
  })
  const [errors, setErrors] = useState<{ name?: string; startDate?: string }>({})
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [importMessage, setImportMessage] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValues({
      name: project.name,
      organization: project.organization,
      startDate: project.startDate,
      description: project.description,
    })
  }, [project.id, project.name, project.organization, project.startDate, project.description])

  useEffect(() => {
    if (!saved) return
    const timeout = window.setTimeout(() => setSaved(false), 2500)
    return () => window.clearTimeout(timeout)
  }, [saved])

  const handleSave = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!values.name.trim()) nextErrors.name = 'Nama proyek wajib diisi.'
    if (!values.startDate) nextErrors.startDate = 'Tanggal mulai wajib diisi.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    updateProject(project.id, {
      name: values.name.trim(),
      organization: values.organization.trim(),
      description: values.description.trim(),
      startDate: values.startDate,
    })
    setSaved(true)
  }

  const handleImportFile = async (file: File) => {
    const text = await file.text()
    const result = parseProjectJson(text)
    if (!result.ok) {
      setImportMessage({ tone: 'error', text: result.error })
      return
    }
    importProject(result.project)
    setImportMessage({
      tone: 'success',
      text: `Proyek “${result.project.name}” berhasil diimpor dan ditambahkan ke dashboard.`,
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Save className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Informasi proyek</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Identitas proyek dapat diubah kapan saja.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <Field label="Nama proyek" htmlFor="settings-name" required error={errors.name}>
            <Input
              id="settings-name"
              value={values.name}
              onChange={(event) => {
                setValues({ ...values, name: event.target.value })
                setSaved(false)
              }}
              invalid={Boolean(errors.name)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organisasi" htmlFor="settings-organization" hint="Opsional">
              <Input
                id="settings-organization"
                value={values.organization}
                onChange={(event) => {
                  setValues({ ...values, organization: event.target.value })
                  setSaved(false)
                }}
              />
            </Field>
            <Field
              label="Tanggal mulai proyek"
              htmlFor="settings-start"
              required
              error={errors.startDate}
              hint="Acuan tugas baru"
            >
              <Input
                id="settings-start"
                type="date"
                value={values.startDate}
                onChange={(event) => {
                  setValues({ ...values, startDate: event.target.value })
                  setSaved(false)
                }}
                invalid={Boolean(errors.startDate)}
              />
            </Field>
          </div>
          <Field label="Deskripsi" htmlFor="settings-description" hint="Opsional">
            <Textarea
              id="settings-description"
              value={values.description}
              onChange={(event) => {
                setValues({ ...values, description: event.target.value })
                setSaved(false)
              }}
              rows={3}
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm">
              <Save className="h-3.5 w-3.5" /> Simpan perubahan
            </Button>
            {saved ? (
              <span className="text-[11px] font-semibold text-emerald-600" role="status">
                Perubahan tersimpan.
              </span>
            ) : null}
          </div>
        </form>
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Data & cadangan</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Data tersimpan otomatis di browser perangkat ini.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => downloadProjectJson(project)}
            >
              <Download className="h-3.5 w-3.5" /> Ekspor proyek (JSON)
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              id="import-project-file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleImportFile(file)
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> Impor proyek dari JSON
            </Button>
          </div>

          {importMessage ? (
            <p
              className={`mt-3 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] leading-relaxed ${
                importMessage.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
              role="status"
            >
              <FileJson className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {importMessage.text}
            </p>
          ) : null}

          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
            File JSON dapat digunakan sebagai cadangan atau dipindahkan ke perangkat
            lain. Proyek yang diimpor akan mendapat salinan baru.
          </p>
        </section>

        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Hapus proyek</h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                Menghapus proyek akan menghilangkan seluruh tugas, jadwal, dan anggota
                tim secara permanen dari perangkat ini.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Hapus proyek ini
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteProject(project.id)
          onDeleted()
        }}
        title="Hapus proyek secara permanen?"
        description={`Proyek “${project.name}” beserta ${project.tasks.length} tugas dan ${project.members.length} anggota tim akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, hapus permanen"
      />
    </div>
  )
}
