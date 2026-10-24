import { describe, expect, it } from 'vitest'
import {
  countWorkingDays,
  endDateForDuration,
  isWorkingDay,
  nextWorkingDay,
  normalizeToWorkingDay,
  shiftWorkingDays,
} from './calendar'
import { parseDateKey, toDateKey } from './dates'
import type { WorkCalendar } from './types'

const calendar: WorkCalendar = {
  workDays: [1, 2, 3, 4, 5],
  holidays: [{ id: 'h1', date: '2026-10-26', name: 'Libur perusahaan' }],
}

describe('isWorkingDay', () => {
  it('mengenali hari kerja, akhir pekan, dan hari libur', () => {
    expect(isWorkingDay(calendar, parseDateKey('2026-10-23'))).toBe(true) // Jumat
    expect(isWorkingDay(calendar, parseDateKey('2026-10-24'))).toBe(false) // Sabtu
    expect(isWorkingDay(calendar, parseDateKey('2026-10-25'))).toBe(false) // Minggu
    expect(isWorkingDay(calendar, parseDateKey('2026-10-26'))).toBe(false) // libur
  })

  it('menghormati pengaturan hari kerja kustom', () => {
    const sixDays: WorkCalendar = { workDays: [1, 2, 3, 4, 5, 6], holidays: [] }
    expect(isWorkingDay(sixDays, parseDateKey('2026-10-24'))).toBe(true)
  })
})

describe('pergeseran hari kerja', () => {
  it('melewati akhir pekan dan hari libur', () => {
    const friday = parseDateKey('2026-10-23')
    expect(toDateKey(nextWorkingDay(calendar, friday))).toBe('2026-10-27')
    expect(toDateKey(shiftWorkingDays(calendar, friday, 1))).toBe('2026-10-27')
    expect(toDateKey(shiftWorkingDays(calendar, friday, 2))).toBe('2026-10-28')
  })

  it('menormalkan tanggal mulai yang jatuh pada hari libur', () => {
    expect(
      toDateKey(normalizeToWorkingDay(calendar, parseDateKey('2026-10-24'))),
    ).toBe('2026-10-27')
  })

  it('menghitung tanggal selesai secara inklusif', () => {
    const friday = parseDateKey('2026-10-23')
    expect(toDateKey(endDateForDuration(calendar, friday, 1))).toBe('2026-10-23')
    expect(toDateKey(endDateForDuration(calendar, friday, 2))).toBe('2026-10-27')
    expect(toDateKey(endDateForDuration(calendar, friday, 3))).toBe('2026-10-28')
  })

  it('menghitung jumlah hari kerja dalam rentang', () => {
    expect(
      countWorkingDays(calendar, parseDateKey('2026-10-23'), parseDateKey('2026-10-28')),
    ).toBe(3)
  })
})
