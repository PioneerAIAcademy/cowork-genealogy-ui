export interface AppAPI {
  openFile: () => Promise<{ filePath: string; content: string; ext: string } | null>
  openExternal: (url: string) => Promise<void>
  getVersion: () => Promise<string>
  onResearchUpdated: (callback: (data: unknown) => void) => void
  onGedcomxUpdated: (callback: (data: unknown) => void) => void
  onWatchError: (callback: (error: string) => void) => void
  removeAllWatchListeners: () => void
  selectFolder: () => Promise<string | null>
  getState: () => Promise<{ folderPath: string | null; research: unknown; gedcomx: unknown }>
}

declare global {
  interface Window {
    api: AppAPI
  }
}
