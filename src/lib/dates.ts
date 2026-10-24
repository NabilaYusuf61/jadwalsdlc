import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { id as localeID } from 'date-fns/locale'

export { addDays, differenceInCalendarDays, endOfMonth, startOfMonth, startOfWeek }

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDateKey(key: string): Date {
  const parsed = parseISO(key)
  return isValid(parsed) ? startOfDay(parsed) : new Date(NaN)
}

export function today(): Date {
  return startOfDay(new Date())
}

export function todayKey(): string {
  return toDateKey(today())
}

export function formatDateID(date: Date, withYear = true): string {
  if (!isValid(date)) return '—'
  return format(date, withYear ? 'd MMM yyyy' : 'd MMM', { locale: localeID })
}

export function formatDateShort(date: Date): string {
  if (!isValid(date)) return '—'
  return format(date, 'd MMM', { locale: localeID })
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: localeID })
}

export function formatMonthShort(date: Date): string {
  return format(date, 'MMM yy', { locale: localeID })
}

export function formatFullDateID(date: Date): string {
  return format(date, 'EEEE, d MMMM yyyy', { locale: localeID })
}

export function formatRangeID(start: Date, end: Date): string {
  if (!isValid(start) || !isValid(end)) return '—'
  if (start.getFullYear() !== end.getFullYear()) {
    return `${formatDateID(start)} – ${formatDateID(end)}`
  }
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd', { locale: localeID })}–${formatDateID(end)}`
  }
  return `${formatDateShort(start)} – ${formatDateID(end)}`
}

export function dayLabel(date: Date): string {
  return format(date, 'EEE', { locale: localeID })
}

export function monthLabel(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: localeID })
}

export function weekLabel(date: Date): string {
  return format(date, 'd MMM', { locale: localeID })
}

export function dayOfMonth(date: Date): string {
  return format(date, 'd')
}

export function addDaysKey(key: string, amount: number): string {
  const date = parseDateKey(key)
  return toDateKey(addDays(date, amount))
}
