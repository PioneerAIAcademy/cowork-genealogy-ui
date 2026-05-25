import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import JSZip from 'jszip'

const MEDIA_EXTS = new Set([
  '.mp3',
  '.wav',
  '.m4a',
  '.ogg',
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.webp'
])

const TEXT_EXTS = new Set(['.json', '.md', '.txt', '.csv', '.tsv', '.yaml', '.yml'])

const INDIVIDUAL_FILE_CAP_BYTES = 25 * 1024 * 1024
const ZIP_CAP_BYTES = 35 * 1024 * 1024

export type ProjectFile = {
  relativePath: string
  sizeBytes: number
  isMedia: boolean
  isText: boolean
}

export async function walkProject(folder: string): Promise<ProjectFile[]> {
  const out: ProjectFile[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.isSymbolicLink()) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile()) {
        const stat = await fs.stat(full)
        const ext = path.extname(entry.name).toLowerCase()
        out.push({
          relativePath: path.relative(folder, full),
          sizeBytes: stat.size,
          isMedia: MEDIA_EXTS.has(ext),
          isText: TEXT_EXTS.has(ext)
        })
      }
    }
  }

  await walk(folder)
  return out
}

export type SessionLog = { entries: unknown[]; sizeBytes: number }

export async function readSessionLog(folderPath: string): Promise<SessionLog> {
  // Claude Code stores sessions in ~/.claude/projects/<path-with-dashes>/
  const projectHash = folderPath.replace(/^\//, '').replace(/\//g, '-')
  const claudeProjectDir = path.join(os.homedir(), '.claude', 'projects', `-${projectHash}`)

  try {
    const files = await fs.readdir(claudeProjectDir)
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'))
    if (jsonlFiles.length === 0) return { entries: [], sizeBytes: 0 }

    const stats = await Promise.all(
      jsonlFiles.map(async (f) => {
        const filePath = path.join(claudeProjectDir, f)
        const stat = await fs.stat(filePath)
        return { filePath, mtime: stat.mtimeMs }
      })
    )
    stats.sort((a, b) => b.mtime - a.mtime)
    const activeFile = stats[0].filePath

    const raw = await fs.readFile(activeFile, 'utf8')
    const lines = raw.split('\n').filter((l) => l.trim())

    const entries: unknown[] = []
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (entry.type !== 'user' && entry.type !== 'assistant') continue
        if (entry.cwd && entry.cwd !== folderPath) continue
        if (entry.type === 'assistant' && entry.message?.content) {
          entry.message.content = entry.message.content.filter(
            (block: { type?: string }) => block.type !== 'thinking'
          )
        }
        entries.push(entry)
      } catch {
        // Skip malformed lines
      }
    }

    const sizeBytes = new TextEncoder().encode(JSON.stringify(entries)).length
    return { entries, sizeBytes }
  } catch {
    return { entries: [], sizeBytes: 0 }
  }
}

export type FeedbackOptions = {
  folderPath: string
  includeMedia: boolean
  includeSessionLog: boolean
  userComment: string | undefined
  viewerVersion: string
}

export type FeedbackResult = {
  filename: string
  zipBase64: string
  fileCount: number
  uncompressedBytes: number
  zipBytes: number
}

export async function buildFeedbackZip(options: FeedbackOptions): Promise<FeedbackResult> {
  const { folderPath, includeMedia, includeSessionLog, userComment, viewerVersion } = options
  const folderResolved = path.resolve(folderPath)
  const folderPrefix = folderResolved + path.sep

  const zip = new JSZip()
  const files = await walkProject(folderResolved)

  let uncompressedBytes = 0
  let fileCount = 0
  const skipped: string[] = []

  for (const f of files) {
    if (f.isMedia && !includeMedia) continue
    if (f.sizeBytes > INDIVIDUAL_FILE_CAP_BYTES) {
      skipped.push(`${f.relativePath} (too large)`)
      continue
    }

    const full = path.resolve(folderResolved, f.relativePath)
    if (full !== folderResolved && !full.startsWith(folderPrefix)) {
      skipped.push(`${f.relativePath} (outside project)`)
      continue
    }

    try {
      const buf = await fs.readFile(full)
      zip.file(f.relativePath, buf)
      uncompressedBytes += buf.length
      fileCount++
    } catch {
      skipped.push(`${f.relativePath} (read failed)`)
    }
  }

  const timestamp = new Date().toISOString()
  const meta = {
    timestamp,
    projectFolder: folderResolved,
    viewerVersion,
    userComment: userComment ?? null,
    skipped: skipped.length > 0 ? skipped : undefined
  }
  zip.file('_feedback/feedback.json', JSON.stringify(meta, null, 2))

  if (includeSessionLog) {
    const sessionLog = await readSessionLog(folderResolved)
    if (sessionLog.entries.length > 0) {
      const jsonl = sessionLog.entries.map((e) => JSON.stringify(e)).join('\n') + '\n'
      zip.file('_feedback/session-log.jsonl', jsonl)
    }
  }

  const buf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  if (buf.length > ZIP_CAP_BYTES) {
    const mb = (buf.length / (1024 * 1024)).toFixed(1)
    throw new Error(
      `Feedback archive is ${mb} MB, which exceeds the 35 MB limit. Try unchecking media files.`
    )
  }

  const safeTimestamp = timestamp.replace(/[:.]/g, '-')
  const filename = `feedback-${safeTimestamp}.zip`

  return {
    filename,
    zipBase64: buf.toString('base64'),
    fileCount,
    uncompressedBytes,
    zipBytes: buf.length
  }
}
