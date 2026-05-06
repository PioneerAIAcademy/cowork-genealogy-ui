import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'chokidar'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

let watcher: FSWatcher | null = null
let currentFolderPath: string | null = null
let lastResearch: unknown = null
let lastGedcomx: unknown = null

const WATCHED_FILES = ['research.json', 'tree.gedcomx.json'] as const

const channelMap: Record<string, string> = {
  'research.json': 'project:research-updated',
  'tree.gedcomx.json': 'project:gedcomx-updated'
}

export function getCurrentState(): {
  folderPath: string | null
  research: unknown
  gedcomx: unknown
} {
  return { folderPath: currentFolderPath, research: lastResearch, gedcomx: lastGedcomx }
}

export function startWatching(folderPath: string, mainWindow: BrowserWindow): void {
  stopWatching()
  currentFolderPath = resolve(folderPath)

  const filePaths = WATCHED_FILES.map((f) => join(folderPath, f))

  watcher = watch(filePaths, {
    awaitWriteFinish: { stabilityThreshold: 300 },
    ignoreInitial: false
  })

  const handleChange = async (filePath: string): Promise<void> => {
    const fileName = WATCHED_FILES.find((f) => filePath.endsWith(f))
    if (!fileName) return

    try {
      const content = await readFile(filePath, 'utf8')
      const data = JSON.parse(content)
      if (fileName === 'research.json') lastResearch = data
      if (fileName === 'tree.gedcomx.json') lastGedcomx = data
      mainWindow.webContents.send(channelMap[fileName], data)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      mainWindow.webContents.send('project:watch-error', `Error reading ${fileName}: ${message}`)
    }
  }

  watcher.on('add', handleChange)
  watcher.on('change', handleChange)

  watcher.on('unlink', (filePath) => {
    const fileName = WATCHED_FILES.find((f) => filePath.endsWith(f))
    mainWindow.webContents.send(
      'project:watch-error',
      `${fileName ?? 'file'} deleted`
    )
  })

  watcher.on('error', (err) => {
    const message = err instanceof Error ? err.message : String(err)
    mainWindow.webContents.send('project:watch-error', `Watcher error: ${message}`)
  })
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
  currentFolderPath = null
  lastResearch = null
  lastGedcomx = null
}
