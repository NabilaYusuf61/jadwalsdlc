import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CalendarDays,
  CalendarOff,
  Check,
  Info,
  Plus,
  Trash2,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Form'
import {
  countWorkingDays,
  formatWorkDays,
  WEEKDAY_OPTIONS,
} from '../../lib/calendar'
import { formatDateID, parseDateKey, today, toDateKey } from '../../lib/dates'
import { computeSchedule } from '../../lib/schedule'
import type { Project } from '../../lib/types'
import { useAppStore } from '../../store/useAppStore'

interface CalendarViewProps {
  project: Project
}

export function CalendarView({ project }: CalendarViewProps) {
  const updateCalendar = useAppStore((state) => state.updateCalendar)
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayName, setHolidayName] = useState('')
  const [error, setError] = useState('')

  const schedule = useMemo(() => computeSchedule(project), [project])
  const workingDaysInRange = useMemo(() => {
    if (!schedule.projectStart || !schedule.projectEnd) return 0
    return countWorkingDays(project.calendar, schedule.projectStart, schedule.projectEnd)
  }, [project.calendar, schedule])

  const toggleWorkDay = (day: number) => {
    const active = project.calendar.workDays.includes(day)
    if (active && project.calendar.workDays.length === 1) return
    const workDays = active
      ? project.calendar.workDays.filter((item) => item !== day)
      : [...project.calendar.workDays, day]
    updateCalendar(project.id, { ...project.calendar, workDays })
  }

  const addHoliday = (event: FormEvent) => {
    event.preventDefault()
    if (!holidayDate) {
      setError('Pilih tanggal hari libur terlebih dahulu.')
      return
    }
    if (!holidayName.trim()) {
      setError('Nama hari libur wajib diisi.')
      return
    }
    if (project.calendar.holidays.some((holiday) => holiday.date === holidayDate)) {
      setError('Tanggal tersebut sudah terdaftar sebagai hari libur.')
      return
    }
    updateCalendar(project.id, {
      ...project.calendar,
      holidays: [
        ...project.calendar.holidays,
        {
          id: `hld_${holidayDate}_${Date.now()}`,
          date: holidayDate,
          name: holidayName.trim(),
        },
      ],
    })
    setHolidayDate('')
    setHolidayName('')
    setError('')
  }

  const sortedHolidays = [...project.calendar.holidays].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const todayKey = toDateKey(today())

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs leading-relaxed text-brand-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <p>
          Durasi setiap tugas dihitung dalam <strong>hari kerja</strong>. Perubahan pada
          hari kerja atau hari libur langsung menyesuaikan tanggal selesai dan jadwal
          Gantt. Saat ini: <strong>{formatWorkDays(project.calendar.workDays)}</strong>,{' '}
          {project.calendar.holidays.length} hari libur khusus.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">Hari kerja</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Pilih hari yang dianggap hari kerja. Minimal satu hari harus aktif.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {WEEKDAY_OPTIONS.map((day) => {
              const active = project.calendar.workDays.includes(day.value)
              const isLastActive = active && project.calendar.workDays.length === 1
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWorkDay(day.value)}
                  disabled={isLastActive}
                  className={`group flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition ${
                    active
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                  } ${isLastActive ? 'cursor-not-allowed opacity-80' : ''}`}
                  aria-pressed={active}
                  title={
                    isLastActive
                      ? 'Minimal satu hari kerja harus aktif'
                      : `${active ? 'Nonaktifkan' : 'Aktifkan'} ${day.label}`
                  }
                >
                  <span className="text-[10px] font-bold">{day.short}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    {active ? <Check className="h-3 w-3" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="text-[11px] font-semibold text-slate-600">
              {formatWorkDays(project.calendar.workDays)}
            </span>
            <span className="text-[10px] text-slate-400">
              {project.calendar.workDays.length} dari 7 hari
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Hari kerja proyek
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">
                {workingDaysInRange}
                <span className="ml-1 text-[10px] font-medium text-slate-400">hari</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Hari libur khusus
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">
                {project.calendar.holidays.length}
                <span className="ml-1 text-[10px] font-medium text-slate-400">tanggal</span>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <CalendarOff className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">Hari libur khusus</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Libur nasional, cuti bersama, atau tanggal nonproduktif lainnya.
              </p>
            </div>
          </div>

          <form onSubmit={addHoliday} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <Field label="Tanggal" htmlFor="holiday-date">
                <Input
                  id="holiday-date"
                  type="date"
                  value={holidayDate}
                  onChange={(event) => {
                    setHolidayDate(event.target.value)
                    setError('')
                  }}
                  className="h-9 text-xs"
                />
              </Field>
              <Field label="Nama libur" htmlFor="holiday-name">
                <Input
                  id="holiday-name"
                  value={holidayName}
                  onChange={(event) => {
                    setHolidayName(event.target.value)
                    setError('')
                  }}
                  placeholder="Contoh: Cuti bersama"
                  className="h-9 text-xs"
                />
              </Field>
            </div>
            {error ? (
              <p className="text-[11px] font-medium text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="sm" variant="secondary">
              <Plus className="h-3.5 w-3.5" /> Tambah hari libur
            </Button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-3">
            {sortedHolidays.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
                Belum ada hari libur khusus. Akhir pekan tetap otomatis dikecualikan.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {sortedHolidays.map((holiday) => {
                  const upcoming = holiday.date >= todayKey
                  return (
                    <li
                      key={holiday.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                    >
                      <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                        <span className="text-[12px] font-extrabold leading-none">
                          {parseDateKey(holiday.date).getDate()}
                        </span>
                        <span className="mt-0.5 text-[8px] font-semibold uppercase leading-none">
                          {formatDateID(parseDateKey(holiday.date), false).split(' ')[1]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-700">
                          {holiday.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDateID(parseDateKey(holiday.date))}
                        </p>
                      </div>
                      {upcoming ? <Badge tone="green">Mendatang</Badge> : null}
                      <button
                        type="button"
                        onClick={() =>
                          updateCalendar(project.id, {
                            ...project.calendar,
                            holidays: project.calendar.holidays.filter(
                              (item) => item.id !== holiday.id,
                            ),
                          })
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Hapus hari libur ${holiday.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
