import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { ResearchData, GedcomxData } from '../lib/schema'

export interface IndexEntry {
  item: unknown
  section: string
}

export interface ResearchDataState {
  research: ResearchData | null
  gedcomx: GedcomxData | null
  error: string | null
  lastUpdated: Date | null
  folderPath: string | null
  devMode: boolean
  setDevMode: (v: boolean) => void
  getById: (id: string) => IndexEntry | null
  selectFolder: () => Promise<void>
  activeSection: string
  setActiveSection: (section: string) => void
}

const ResearchDataContext = createContext<ResearchDataState | null>(null)

export function buildIndex(
  research: ResearchData | null,
  gedcomx: GedcomxData | null
): Map<string, IndexEntry> {
  const map = new Map<string, IndexEntry>()
  if (!research) return map

  const sections: [string, unknown[]][] = [
    ['questions', research.questions],
    ['plans', research.plans],
    ['log', research.log],
    ['sources', research.sources],
    ['assertions', research.assertions],
    ['person_evidence', research.person_evidence],
    ['conflicts', research.conflicts],
    ['hypotheses', research.hypotheses],
    ['timelines', research.timelines],
    ['proof_summaries', research.proof_summaries]
  ]

  for (const [section, items] of sections) {
    for (const item of items) {
      const id = (item as { id?: string }).id
      if (id) map.set(id, { item, section })
    }
  }

  // Also index plan items (nested inside plans)
  for (const plan of research.plans) {
    for (const planItem of plan.items) {
      map.set(planItem.id, { item: planItem, section: 'plan_items' })
    }
  }

  // Index project
  if (research.project?.id) {
    map.set(research.project.id, { item: research.project, section: 'project' })
  }

  // Index GedcomX entities
  if (gedcomx) {
    for (const person of gedcomx.persons) {
      map.set(person.id, { item: person, section: 'gedcomx_persons' })
    }
    for (const rel of gedcomx.relationships) {
      map.set(rel.id, { item: rel, section: 'gedcomx_relationships' })
    }
    for (const src of gedcomx.sources) {
      map.set(src.id, { item: src, section: 'gedcomx_sources' })
    }
  }

  return map
}

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

export function useResearchData(): ResearchDataState {
  const ctx = useContext(ResearchDataContext)
  if (!ctx) throw new Error('useResearchData must be used within ResearchDataProvider')
  return ctx
}
