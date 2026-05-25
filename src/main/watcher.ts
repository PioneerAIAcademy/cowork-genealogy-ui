import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'chokidar'
import { readFile, stat as fsStat } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'

let watcher: FSWatcher | null = null
let currentFolderPath: string | null = null
let lastResearch: unknown = null
let lastGedcomx: unknown = null

const WATCHED_FILES = ['research.json', 'tree.gedcomx.json'] as const
type FixedFile = (typeof WATCHED_FILES)[number]

const channelMap: Record<FixedFile, string> = {
  'research.json': 'project:research-updated',
  'tree.gedcomx.json': 'project:gedcomx-updated'
}

// log_<alphanumeric>.json — anything else under results/ is ignored (READMEs,
// .DS_Store, .tmp during atomic writes, etc.).
const SIDECAR_BASENAME = /^(log_[a-zA-Z0-9_-]+)\.json$/

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

  const fixedPaths = WATCHED_FILES.map((f) => join(folderPath, f))
  const sidecarDir = join(folderPath, 'results')

  // Single chokidar instance; we extend it to also watch results/ so there's
  // one lifecycle and one stopWatching path. Dispatch by basename below.
  watcher = watch(fixedPaths, {
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ignoreInitial: false
  })
  watcher.add(sidecarDir)

  const handleChange = async (filePath: string): Promise<void> => {
    const base = basename(filePath)

    // Fixed-file branch (existing behavior — research.json / tree.gedcomx.json)
    if ((WATCHED_FILES as readonly string[]).includes(base)) {
      try {
        const content = await readFile(filePath, 'utf8')
        const data = JSON.parse(content)
        if (base === 'research.json') lastResearch = data
        if (base === 'tree.gedcomx.json') lastGedcomx = data
        mainWindow.webContents.send(channelMap[base as FixedFile], data)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        mainWindow.webContents.send('project:watch-error', `Error reading ${base}: ${message}`)
      }
      return
    }

    // Sidecar branch — pointer-only event so the watcher stays cheap even
    // when the renderer doesn't have a drawer open for this logId.
    const m = base.match(SIDECAR_BASENAME)
    if (!m) return
    const logId = m[1]
    const st = await fsStat(filePath).catch(() => null)
    if (!st) return
    mainWindow.webContents.send('project:sidecar-updated', {
      logId,
      mtime: st.mtimeMs
    })
  }

  watcher.on('add', handleChange)
  watcher.on('change', handleChange)

  watcher.on('unlink', (filePath) => {
    const base = basename(filePath)
    if ((WATCHED_FILES as readonly string[]).includes(base)) {
      mainWindow.webContents.send('project:watch-error', `${base} deleted`)
      return
    }
    const m = base.match(SIDECAR_BASENAME)
    if (m) {
      // mtime: 0 sentinel = the sidecar was removed
      mainWindow.webContents.send('project:sidecar-updated', { logId: m[1], mtime: 0 })
    }
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
