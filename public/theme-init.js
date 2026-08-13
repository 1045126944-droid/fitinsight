/* global document, window */

;(() => {
  let theme = 'system'

  try {
    const storedTheme = window.localStorage.getItem('fitinsight.theme')
    if (
      storedTheme === 'light' ||
      storedTheme === 'dark' ||
      storedTheme === 'system'
    ) {
      theme = storedTheme
    }
  } catch {
    // Storage can be unavailable in private browsing or hardened contexts.
  }

  if (theme === 'system') {
    try {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
    } catch {
      theme = 'dark'
    }
  }

  document.documentElement.dataset.theme = theme
})()
