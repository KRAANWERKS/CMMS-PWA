// User-selectable text size. Mantine sizes are rem-based, so scaling the root scales the whole app.
export type TextScale = 'standard' | 'large' | 'xlarge'

const KEY = 'cmms:text-scale'
const percent: Record<TextScale, string> = { standard: '100%', large: '112.5%', xlarge: '125%' }

export function getTextScale(): TextScale {
  try {
    const stored = window.localStorage.getItem(KEY)
    if (stored === 'large' || stored === 'xlarge') return stored
  } catch { /* storage unavailable */ }
  return 'standard'
}

export function applyTextScale(scale: TextScale) {
  document.documentElement.style.fontSize = percent[scale]
}

export function setTextScale(scale: TextScale) {
  try { window.localStorage.setItem(KEY, scale) } catch { /* storage unavailable */ }
  applyTextScale(scale)
}
