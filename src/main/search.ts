import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'

interface SearchOptions {
  query: string
  rootPath: string
  includeFiles: boolean
  includeDirs: boolean
  extensions?: string[]
  minSize?: number
  maxSize?: number
  modifiedAfter?: number
  modifiedBefore?: number
  caseSensitive?: boolean
  regex?: boolean
  contentSearch?: boolean
}

interface SearchResult {
  path: string
  name: string
  isDirectory: boolean
  size: number
  modified: number
  matchedContent?: string
}

export function registerSearchHandlers(): void {
  ipcMain.handle('search:files', async (event, options: SearchOptions) => {
    // rootPath 유효성 검사 — 경로가 실제 존재하는 디렉터리인지 확인
    const normalizedRoot = path.resolve(options.rootPath ?? '')
    try {
      const stat = fs.statSync(normalizedRoot)
      if (!stat.isDirectory()) {
        return { success: false, error: '유효하지 않은 경로입니다.' }
      }
    } catch {
      return { success: false, error: '경로를 찾을 수 없습니다.' }
    }

    const results: SearchResult[] = []
    let cancelled = false

    // 취소 핸들러
    const cancelHandler = () => { cancelled = true }
    ipcMain.once('search:cancel', cancelHandler)

    const LIMIT = 5000
    try {
      await walkSearch(normalizedRoot, options, results, () => {
        if (results.length % 50 === 0) {
          event.sender.send('search:progress', results.length)
        }
        return cancelled || results.length >= LIMIT   // early exit at limit
      })
    } finally {
      ipcMain.removeListener('search:cancel', cancelHandler)
    }

    return { success: true, data: results.slice(0, LIMIT) }
  })
}

async function walkSearch(
  dirPath: string,
  options: SearchOptions,
  results: SearchResult[],
  shouldCancel: () => boolean
): Promise<void> {
  if (shouldCancel()) return

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (shouldCancel()) return

    const fullPath = path.join(dirPath, entry.name)
    const isDir = entry.isDirectory()

    if (isDir) {
      if (options.includeDirs && matchesQuery(entry.name, options)) {
        try {
          const stats = fs.statSync(fullPath)
          results.push({
            path: fullPath,
            name: entry.name,
            isDirectory: true,
            size: 0,
            modified: stats.mtimeMs
          })
        } catch {}
      }
      await walkSearch(fullPath, options, results, shouldCancel)
    } else {
      if (!options.includeFiles) continue

      const ext = path.extname(entry.name).toLowerCase()
      if (options.extensions && options.extensions.length > 0) {
        if (!options.extensions.includes(ext)) continue
      }

      let stats: fs.Stats
      try {
        stats = fs.statSync(fullPath)
      } catch {
        continue
      }

      if (options.minSize !== undefined && stats.size < options.minSize) continue
      if (options.maxSize !== undefined && stats.size > options.maxSize) continue
      if (options.modifiedAfter !== undefined && stats.mtimeMs < options.modifiedAfter) continue
      if (options.modifiedBefore !== undefined && stats.mtimeMs > options.modifiedBefore) continue

      if (matchesQuery(entry.name, options)) {
        let matchedContent: string | undefined

        if (options.contentSearch && options.query) {
          const found = searchFileContent(fullPath, options.query, options.caseSensitive)
          if (found === null) continue
          matchedContent = found
        }

        results.push({
          path: fullPath,
          name: entry.name,
          isDirectory: false,
          size: stats.size,
          modified: stats.mtimeMs,
          matchedContent
        })
      }
    }
  }
}

function matchesQuery(name: string, options: SearchOptions): boolean {
  if (!options.query) return true

  if (options.regex) {
    try {
      // ReDoS 방어: 쿼리 길이 제한 + 위험 패턴 차단
      if (options.query.length > 200) return false
      if (/(\(.*\+\)|\(.*\*\)|\{\d+,\}).*\+/.test(options.query)) return false
      const flags = options.caseSensitive ? '' : 'i'
      const re = new RegExp(options.query, flags)
      return re.test(name)
    } catch {
      return false
    }
  }

  const haystack = options.caseSensitive ? name : name.toLowerCase()
  const needle = options.caseSensitive ? options.query : options.query.toLowerCase()
  return haystack.includes(needle)
}

function searchFileContent(filePath: string, query: string, caseSensitive?: boolean): string | null {
  try {
    const stat = fs.statSync(filePath)
    if (stat.size > 10 * 1024 * 1024) return null // 10MB 초과 파일 스킵
    const content = fs.readFileSync(filePath, 'utf-8')
    const haystack = caseSensitive ? content : content.toLowerCase()
    const needle = caseSensitive ? query : query.toLowerCase()
    const idx = haystack.indexOf(needle)
    if (idx === -1) return null
    const start = Math.max(0, idx - 40)
    const end = Math.min(content.length, idx + query.length + 40)
    return '...' + content.slice(start, end) + '...'
  } catch {
    return null
  }
}
