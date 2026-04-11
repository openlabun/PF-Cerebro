import { describe, expect, it } from 'vitest'
import {
  formatTournamentDate,
  fromDateTimeLocal,
  getTournamentTimestamp,
  parseTournamentDateValue,
  toDateTimeLocal,
} from '../src/lib/tournaments.js'

describe('tournament timezone helpers', () => {
  it('formats UTC timestamps using Colombia time for datetime-local inputs', () => {
    expect(toDateTimeLocal('2026-04-10T15:05:00.000Z')).toBe('2026-04-10T10:05')
  })

  it('preserves manual datetime-local values as Colombia wall time', () => {
    expect(fromDateTimeLocal('2026-04-10T10:05')).toBe('2026-04-10T10:05')
  })

  it('parses timezone-less tournament dates as Colombia time', () => {
    expect(parseTournamentDateValue('2026-04-10T10:05', { kind: 'schedule' })?.toISOString()).toBe(
      '2026-04-10T15:05:00.000Z',
    )
  })

  it('builds sortable timestamps with the same Colombia-time rule', () => {
    expect(getTournamentTimestamp('2026-04-10T10:05', { kind: 'schedule' })).toBe(
      Date.parse('2026-04-10T15:05:00.000Z'),
    )
  })

  it('treats timezone-less system timestamps as UTC and shows them in Colombia time', () => {
    expect(parseTournamentDateValue('2026-04-11T16:49:00', { kind: 'system' })?.toISOString()).toBe(
      '2026-04-11T16:49:00.000Z',
    )
    expect(formatTournamentDate('2026-04-11T16:49:00', { kind: 'system' })).toContain('11:49')
  })
})
