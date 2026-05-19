import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { ResearchData, GedcomxData } from '../lib/schema'
import {
  ResearchDataContext,
  buildIndex,
  type IndexEntry,
  type ResearchDataState
} from './ResearchDataContext'

export function ResearchDataProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [research, setResearch] = useState<ResearchData | null>(null)
  const [gedcomx, setGedcomx] = useState<GedcomxData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [devMode, setDevMode] = useState(false)
  const [activeSection, setActiveSection] = useState('project_overview')

  useEffect(() => {
    // Hydrate from main process state (covers CLI --project-dir and page reloads)
    window.api.getState().then((state) => {
      if (state.folderPath) {
        setFolderPath(state.folderPath)
        if (state.research) {
          setResearch(state.research as ResearchData)
          setLastUpdated(new Date())
        }
        if (state.gedcomx) {
          setGedcomx(state.gedcomx as GedcomxData)
        }
      }
    })

    window.api.onResearchUpdated((data) => {
      setResearch(data as ResearchData)
      setLastUpdated(new Date())
      setError(null)
      setFolderPath((prev) => prev ?? '(watching)')
    })

    window.api.onGedcomxUpdated((data) => {
      setGedcomx(data as GedcomxData)
      setLastUpdated(new Date())
    })

    window.api.onWatchError((err) => {
      setError(err)
    })

    return () => {
      window.api.removeAllWatchListeners()
    }
  }, [])

  const index = useMemo(() => buildIndex(research, gedcomx), [research, gedcomx])

  const getById = useCallback(
    (id: string): IndexEntry | null => {
      const entry = index.get(id)
      if (!entry) {
        console.warn(`[ResearchDataContext] Reference not found: ${id}`)
        return null
      }
      return entry
    },
    [index]
  )

  const clearError = useCallback(() => setError(null), [])

  const selectFolder = useCallback(async () => {
    const path = await window.api.selectFolder()
    if (path) {
      setFolderPath(path)
      setError(null)
    }
  }, [])

  const value: ResearchDataState = useMemo(
    () => ({
      research,
      gedcomx,
      error,
      clearError,
      lastUpdated,
      folderPath,
      devMode,
      setDevMode,
      getById,
      selectFolder,
      activeSection,
      setActiveSection
    }),
    [
      research,
      gedcomx,
      error,
      clearError,
      lastUpdated,
      folderPath,
      devMode,
      getById,
      selectFolder,
      activeSection
    ]
  )

  return <ResearchDataContext.Provider value={value}>{children}</ResearchDataContext.Provider>
}
