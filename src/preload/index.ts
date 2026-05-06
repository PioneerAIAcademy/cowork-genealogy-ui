import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('open-file'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getVersion: () => ipcRenderer.invoke('get-version'),
  onResearchUpdated: (callback: (data: unknown) => void) => {
    ipcRenderer.on('project:research-updated', (_e, data) => callback(data))
  },
  onGedcomxUpdated: (callback: (data: unknown) => void) => {
    ipcRenderer.on('project:gedcomx-updated', (_e, data) => callback(data))
  },
  onWatchError: (callback: (error: string) => void) => {
    ipcRenderer.on('project:watch-error', (_e, error) => callback(error))
  },
  removeAllWatchListeners: () => {
    ipcRenderer.removeAllListeners('project:research-updated')
    ipcRenderer.removeAllListeners('project:gedcomx-updated')
    ipcRenderer.removeAllListeners('project:watch-error')
  },
  selectFolder: () => ipcRenderer.invoke('project:select-folder'),
  getState: () => ipcRenderer.invoke('project:get-state'),
  submitFeedback: (payload: {
    research?: unknown
    gedcomx?: unknown
    sessionLog?: unknown[]
    userComment?: string
  }) => ipcRenderer.invoke('feedback:submit', payload)
})
