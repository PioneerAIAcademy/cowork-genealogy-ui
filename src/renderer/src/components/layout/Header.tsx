import { useResearchData } from '../../contexts/ResearchDataContext'
import styles from './Header.module.css'

function useTheme(): { theme: string; toggle: () => void } {
  const stored = localStorage.getItem('theme') || 'light'
  const toggle = (): void => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
  }
  // Initialize on first render
  if (document.documentElement.dataset.theme == null) {
    document.documentElement.dataset.theme = stored
  }
  return { theme: document.documentElement.dataset.theme || stored, toggle }
}

export default function Header(): React.JSX.Element {
  const { devMode, setDevMode, lastUpdated, error } = useResearchData()
  const { theme, toggle: toggleTheme } = useTheme()

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
          <button className={styles.dismiss} onClick={() => {}}>
            ✕
          </button>
        </div>
      )}
    </header>
  )
}
