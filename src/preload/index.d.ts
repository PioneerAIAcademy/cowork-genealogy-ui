export interface AppAPI {
  openFile: () => Promise<{ filePath: string; content: string; ext: string } | null>
  openExternal: (url: string) => Promise<void>
  getVersion: () => Promise<string>
  onResearchUpdated: (callback: (data: unknown) => void) => void
  onGedcomxUpdated: (callback: (data: unknown) => void) => void
  onWatchError: (callback: (error: string) => void) => void
  onSidecarUpdated: (callback: (event: { logId: string; mtime: number }) => void) => void
  removeAllWatchListeners: () => void
  getSessionLog: () => Promise<{ entries: unknown[]; sizeBytes: number }>
  selectFolder: () => Promise<string | null>
  getState: () => Promise<{ folderPath: string | null; research: unknown; gedcomx: unknown }>
  submitFeedback: (payload: {
    research?: unknown
    gedcomx?: unknown
    sessionLog?: unknown[]
    userComment?: string
  }) => Promise<{ ok: true }>
  readSidecar: (logId: string) => Promise<{ raw: string; mtime: number } | null>
}

declare global {
  interface Window {
    api: AppAPI
  }
}
