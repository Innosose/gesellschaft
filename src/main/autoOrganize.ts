import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface OrganizeRule {
  id: string
  name: string
  enabled: boolean
  sourceDir: string
  conditions: {
    type: 'extension' | 'name_contains' | 'size_gt' | 'size_lt' | 'older_than' | 'newer_than'
    value: string
  }[]
  action: {
    type: 'move' | 'copy'
    targetDir: string
    createSubfolder?: string // 'extension' | 'date' | 'none'
  }
}

function getRulesPath(): string {
  return path.join(app.getPath('userData'), 'organize-rules.json')
}

function loadRules(): OrganizeRule[] {
  try {
    return JSON.parse(fs.readFileSync(getRulesPath(), 'utf-8'))
  } catch {
    return []
  }
}

function saveRules(rules: OrganizeRule[]): void {
  fs.writeFileSync(getRulesPath(), JSON.stringify(rules, null, 2))
}

export function registerAutoOrganizeHandlers(): void {
  ipcMain.handle('organize:getRules', async () => loadRules())

  ipcMain.handle('organize:saveRule', async (_, rule: OrganizeRule) => {
    const rules = loadRules()
    const idx = rules.findIndex((r) => r.id === rule.id)
    if (idx >= 0) {
      rules[idx] = rule
    } else {
      rules.push(rule)
    }
    saveRules(rules)
    return { success: true }
  })

  ipcMain.handle('organize:deleteRule', async (_, ruleId: string) => {
    const rules = loadRules().filter((r) => r.id !== ruleId)
    saveRules(rules)
    return { success: true }
  })

  ipcMain.handle('organize:runRule', async (event, rule: OrganizeRule) => {
    const results: { file: string; action: string; success: boolean; error?: string }[] = []

    try {
      const entries = fs.readdirSync(rule.sourceDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) continue
        const filePath = path.join(rule.sourceDir, entry.name)

        try {
          const stats = fs.statSync(filePath)
          if (!matchesConditions(entry.name, stats, rule.conditions)) continue

          let targetDir = rule.action.targetDir
          if (rule.action.createSubfolder === 'extension') {
            const ext = path.extname(entry.name).slice(1) || 'unknown'
            targetDir = path.join(targetDir, ext.toUpperCase())
          } else if (rule.action.createSubfolder === 'date') {
            const date = new Date(stats.mtimeMs)
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            targetDir = path.join(targetDir, month)
          }

          fs.mkdirSync(targetDir, { recursive: true })
          const destPath = path.join(targetDir, entry.name)

          if (rule.action.type === 'move') {
            fs.renameSync(filePath, destPath)
          } else {
            fs.copyFileSync(filePath, destPath)
          }

          results.push({ file: filePath, action: rule.action.type, success: true })
        } catch (err) {
          results.push({ file: filePath, action: rule.action.type, success: false, error: String(err) })
        }

        event.sender.send('organize:progress', results.length)
      }
    } catch (err) {
      return { success: false, error: String(err), results }
    }

    return { success: true, results }
  })
}

function matchesConditions(
  name: string,
  stats: fs.Stats,
  conditions: OrganizeRule['conditions']
): boolean {
  for (const cond of conditions) {
    switch (cond.type) {
      case 'extension': {
        const ext = path.extname(name).toLowerCase()
        const allowed = cond.value.split(',').map((e) => e.trim().toLowerCase())
        if (!allowed.includes(ext)) return false
        break
      }
      case 'name_contains':
        if (!name.toLowerCase().includes(cond.value.toLowerCase())) return false
        break
      case 'size_gt':
        if (stats.size <= parseInt(cond.value)) return false
        break
      case 'size_lt':
        if (stats.size >= parseInt(cond.value)) return false
        break
      case 'older_than': {
        const days = parseInt(cond.value)
        const cutoff = Date.now() - days * 86400000
        if (stats.mtimeMs > cutoff) return false
        break
      }
      case 'newer_than': {
        const days = parseInt(cond.value)
        const cutoff = Date.now() - days * 86400000
        if (stats.mtimeMs < cutoff) return false
        break
      }
    }
  }
  return true
}
