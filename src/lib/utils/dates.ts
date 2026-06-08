const HOLD_DAYS = 3

export function holdReleaseDate(paidAt: Date): Date {
  const release = new Date(paidAt)
  release.setDate(release.getDate() + HOLD_DAYS)
  release.setHours(23, 59, 59, 999)
  return release
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-MW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-MW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
