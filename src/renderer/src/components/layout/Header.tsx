import { useState, useCallback } from 'react'
import { useResearchData } from '../../contexts/ResearchDataContext'
import styles from './Header.module.css'

function getInitialTheme(): string {
  const stored = localStorage.getItem('theme') || 'light'
  if (document.documentElement.dataset.theme == null) {
    document.documentElement.dataset.theme = stored
  }
  return stored
}

export default function Header(): React.JSX.Element {
  const { devMode, setDevMode, lastUpdated, error, clearError } = useResearchData()
  const [theme, setTheme] = useState(getInitialTheme)

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    setTheme(next)
  }, [theme])

  return (
    <header className={styles.header}>
      <div className={styles.title}>Research Viewer</div>
      <div className={styles.controls}>
        {lastUpdated && (
          <span className={styles.timestamp}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <button
          className={`${styles.toggle} ${devMode ? styles.active : ''}`}
          onClick={() => setDevMode(!devMode)}
          title="Toggle developer mode"
        >
          {'</>'}
        </button>
        <button
          className={styles.toggle}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀' : '☽'}
        </button>
      </div>
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button className={styles.dismiss} onClick={clearError}>
            ✕
          </button>
        </div>
      )}
    </header>
  )
}
