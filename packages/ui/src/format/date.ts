// Shared date formatting. Displayed dates read yyyy/mm/dd on every device, so they are built from the
// local date parts rather than toLocaleDateString, whose output follows the browser/OS locale.
// Times are deliberately left in the user's locale (hour:minute).

export type DateLike = Date | string | number | null | undefined

function toDate(value: DateLike): Date | null {
  if (value == null || value === '') return null
  // A plain yyyy-mm-dd string is a calendar date, not an instant. Anchor it at local noon so the
  // displayed day never shifts backwards/forwards across timezones (new Date('2026-09-15') is UTC midnight).
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    const date = new Date(y, m - 1, d, 12)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (n: number) => String(n).padStart(2, '0')

/** yyyy/mm/dd, or '' when the value is empty or unparseable. */
export function formatDate(value: DateLike): string {
  const date = toDate(value)
  if (!date) return ''
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

/** yyyy/mm/dd HH:MM (24h, locale time), or '' when empty/unparseable. */
export function formatDateTime(value: DateLike): string {
  const date = toDate(value)
  if (!date) return ''
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${formatDate(date)} ${time}`
}

/** yyyy-mm-dd for the value attribute of a native <input type="date">. '' when empty/unparseable. */
export function toDateInputValue(value: DateLike): string {
  const date = toDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
