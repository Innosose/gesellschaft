import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'

export interface CompareEntry {
  relativePath: string
  name: string
  status: 'only_a' | 'only_b' | 'modified' | 'same'
  sizeA?: number
  sizeB?: number
  modifiedA?: number
  modifiedB?: number
}

function getFilesRecursive(
  dir: string,
  base: string = dir
): Map<string, { size: number; modified: number }> {
  const map = new Map<string, { size: number; modified: number }>()
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relPath = path.relative(base, fullPath)
      try {
        if (entry.isDirectory()) {
          getFilesRecursive(fullPath, base).forEach((v, k) => map.set(k, v))
        } else {
          const stat = fs.statSync(fullPath)
          map.set(relPath, { size: stat.size, modified: stat.mtimeMs })
        }
      } catch {}
    }
  } catch {}
  return map
}

export function registerFolderCompareHandlers(): void {
  ipcMain.handle('folderCompare:compare', async (_, pathA: string, pathB: string) => {
    try {
      const filesA = getFilesRecursive(pathA)
      const filesB = getFilesRecursive(pathB)
      const results: CompareEntry[] = []
      const allKeys = new Set([...filesA.keys(), ...filesB.keys()])

      for (const relPath of allKeys) {
        const inA = filesA.get(relPath)
        const inB = filesB.get(relPath)
        const name = path.basename(relPath)

        if (inA && !inB) {
          results.push({ relativePath: relPath, name, status: 'only_a', sizeA: inA.size, modifiedA: inA.modified })
        } else if (!inA && inB) {
          results.push({ relativePath: relPath, name, status: 'only_b', sizeB: inB.size, modifiedB: inB.modified })
        } else if (inA && inB) {
          const isDiff = inA.size !== inB.size || Math.abs(inA.modified - inB.modified) > 2000
          results.push({
            relativePath: relPath,
            name,
            status: isDiff ? 'modified' : 'same',
            sizeA: inA.size,
            sizeB: inB.size,
            modifiedA: inA.modified,
            modifiedB: inB.modified
          })
        }
      }

      const order = { modified: 0, only_a: 1, only_b: 2, same: 3 }
      results.sort((a, b) => order[a.status] - order[b.status] || a.relativePath.localeCompare(b.relativePath, 'ko'))

      return { success: true, data: results }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
