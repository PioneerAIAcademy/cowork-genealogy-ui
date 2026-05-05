export interface AppAPI {
  openFile: () => Promise<{ filePath: string; content: string; ext: string } | null>
  openExternal: (url: string) => Promise<void>
  getVersion: () => Promise<string>
}

declare global {
  interface Window {
    api: AppAPI
  }
}
