import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import { toDateKey } from './dates'
import type { Holiday, WorkCalendar } from './types'

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Senin', short: 'Sen' },
  { value: 2, label: 'Selasa', short: 'Sel' },
  { value: 3, label: 'Rabu', short: 'Rab' },
  { value: 4, label: 'Kamis', short: 'Kam' },
  { value: 5, label: 'Jumat', short: 'Jum' },
  { value: 6, label: 'Sabtu', short: 'Sab' },
  { value: 0, label: 'Minggu', short: 'Min' },
] as const

export function holidayOn(calendar: WorkCalendar, date: Date): Holiday | undefined {
  const key = toDateKey(date)
  return calendar.holidays.find((holiday) => holiday.date === key)
}

export function isWorkingDay(calendar: WorkCalendar, date: Date): boolean {
  const day = startOfDay(date).getDay()
  if (!calendar.workDays.includes(day)) return false
  return !holidayOn(calendar, date)
}

/** Hari kerja pertama setelah tanggal (tidak termasuk tanggal itu sendiri). */
export function nextWorkingDay(calendar: WorkCalendar, date: Date): Date {
  let candidate = startOfDay(date)
  for (let i = 0; i < 4000; i += 1) {
    candidate = addDays(candidate, 1)
    if (isWorkingDay(calendar, candidate)) return candidate
  }
  return candidate
}

/** Hari kerja terakhir sebelum tanggal (tidak termasuk tanggal itu sendiri). */
export function previousWorkingDay(calendar: WorkCalendar, date: Date): Date {
  let candidate = startOfDay(date)
  for (let i = 0; i < 4000; i += 1) {
    candidate = addDays(candidate, -1)
    if (isWorkingDay(calendar, candidate)) return candidate
  }
  return candidate
}

/** Maju sebanyak `amount` hari kerja. Hari mulai dihitung sebagai titik nol. */
export function shiftWorkingDays(calendar: WorkCalendar, start: Date, amount: number): Date {
  let current = startOfDay(start)
  if (!isWorkingDay(calendar, current)) {
    current = nextWorkingDay(calendar, current)
  }
  let remaining = Math.max(0, Math.floor(amount))
  for (let i = 0; i < 4000 && remaining > 0; i += 1) {
    current = addDays(current, 1)
    if (isWorkingDay(calendar, current)) remaining -= 1
  }
  return current
}

/** Tanggal selesai inklusif untuk durasi hari kerja. */
export function endDateForDuration(
  calendar: WorkCalendar,
  start: Date,
  durationDays: number,
): Date {
  return shiftWorkingDays(calendar, start, Math.max(1, durationDays) - 1)
}

/** Jumlah hari kerja inklusif antara dua tanggal. */
export function countWorkingDays(calendar: WorkCalendar, start: Date, end: Date): number {
  const span = differenceInCalendarDays(end, start)
  if (span < 0) return 0
  if (span > 3650) return 0
  let count = 0
  for (let i = 0; i <= span; i += 1) {
    if (isWorkingDay(calendar, addDays(start, i))) count += 1
  }
  return count
}

/** Jumlah hari kalender inklusif antara dua tanggal. */
export function countCalendarDays(start: Date, end: Date): number {
  return Math.max(0, differenceInCalendarDays(end, start) + 1)
}

/** Geser tanggal ke hari kerja berikutnya bila jatuh pada akhir pekan/libur. */
export function normalizeToWorkingDay(calendar: WorkCalendar, date: Date): Date {
  return isWorkingDay(calendar, date) ? startOfDay(date) : nextWorkingDay(calendar, date)
}

export function formatWorkDays(workDays: number[]): string {
  const ordered = WEEKDAY_OPTIONS.filter((day) => workDays.includes(day.value))
  const standard = [1, 2, 3, 4, 5]
  const isStandard =
    workDays.length === 5 && standard.every((day) => workDays.includes(day))
  if (isStandard) return 'Senin – Jumat'
  if (ordered.length === 7) return 'Setiap hari'
  if (ordered.length === 0) return 'Belum ada hari kerja'
  return ordered.map((day) => day.short).join(', ')
}
