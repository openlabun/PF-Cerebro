export const themes = ['light', 'dark']
export const THEME_KEY = 'sudoku-theme'

function isValidTheme(theme) {
  return themes.includes(theme)
}

export function getStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_KEY)
    return isValidTheme(storedTheme) ? storedTheme : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  const nextTheme = isValidTheme(theme) ? theme : 'light'

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  try {
    localStorage.setItem(THEME_KEY, nextTheme)
  } catch {}

  return nextTheme
}

export function getThemeLabel(theme) {
  return theme === 'dark' ? 'Oscuro' : 'Claro'
}

export function getNextTheme(currentTheme) {
  const currentIndex = themes.indexOf(currentTheme)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  return themes[(safeIndex + 1) % themes.length]
}
