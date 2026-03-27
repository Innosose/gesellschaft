import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import log, { logIpcError } from './logger'

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
    createSubfolder?: string
  }
}

const ConditionSchema = z.object({
  type:  z.enum(['extension', 'name_contains', 'size_gt', 'size_lt', 'older_than', 'newer_than']),
  value: z.string().max(500),
})

const OrganizeRuleSchema = z.object({
  id:         z.string().min(1),
  name:       z.string().min(1).max(200),
  enabled:    z.boolean(),
  sourceDir:  z.string().min(1),
  conditions: z.array(ConditionSchema).max(20),
  action: z.object({
    type:            z.enum(['move', 'copy']),
    targetDir:       z.string().min(1),
    createSubfolder: z.string().optional(),
  }),
})

const RuleIdSchema = z.string().min(1)

function getRulesPath(): string {
  return path.join(app.getPath('userData'), 'organize-rules.json')
}

function loadRules(): OrganizeRule[] {
  try {
    const raw = JSON.parse(fs.readFileSync(getRulesPath(), 'utf-8'))
    return Array.isArray(raw) ? raw : []
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('[autoOrganize] 파일 로드 실패', err)
    }
    return []
  }
}

function saveRules(rules: OrganizeRule[]): void {
  try {
    fs.writeFileSync(getRulesPath(), JSON.stringify(rules, null, 2))
  } catch (err) {
    log.error('[autoOrganize] 파일 저장 실패', err)
  }
}

export function registerAutoOrganizeHandlers(): void {
  ipcMain.handle('organize:getRules', async () => loadRules())

  ipcMain.handle('organize:saveRule', async (_, raw: unknown) => {
    const result = OrganizeRuleSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[organize:saveRule] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 규칙 데이터' }
    }
    const rule = result.data
    const rules = loadRules()
    const idx = rules.findIndex(r => r.id === rule.id)
    if (idx >= 0) {
      rules[idx] = rule
    } else {
      rules.push(rule)
    }
    saveRules(rules)
    log.debug(`[organize:saveRule] id=${rule.id} name="${rule.name}"`)
    return { success: true }
  })

  ipcMain.handle('organize:deleteRule', async (_, raw: unknown) => {
    const result = RuleIdSchema.safeParse(raw)
    if (!result.success) return { success: false, error: '유효하지 않은 id' }
    const rules = loadRules().filter(r => r.id !== result.data)
    saveRules(rules)
    log.debug(`[organize:deleteRule] id=${result.data}`)
    return { success: true }
  })

  ipcMain.handle('organize:runRule', async (event, raw: unknown) => {
    const result = OrganizeRuleSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[organize:runRule] 유효하지 않은 규칙', result.error.flatten())
      return { success: false, error: '유효하지 않은 규칙 데이터', results: [] }
    }
    const rule = result.data
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
          logIpcError('organize:runRule/entry', err, { filePath })
          results.push({ file: filePath, action: rule.action.type, success: false, error: String(err) })
        }

        event.sender.send('organize:progress', results.length)
      }
    } catch (err) {
      logIpcError('organize:runRule', err, { sourceDir: rule.sourceDir })
      return { success: false, error: String(err), results }
    }

    log.info(`[organize:runRule] 완료: ${results.filter(r => r.success).length}/${results.length} 성공`)
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
        const allowed = cond.value.split(',').map(e => e.trim().toLowerCase())
        if (!allowed.includes(ext)) return false
        break
      }
      case 'name_contains':
        if (!name.toLowerCase().includes(cond.value.toLowerCase())) return false
        break
      case 'size_gt': {
        const limit = parseInt(cond.value, 10)
        if (isNaN(limit) || stats.size <= limit) return false
        break
      }
      case 'size_lt': {
        const limit = parseInt(cond.value, 10)
        if (isNaN(limit) || stats.size >= limit) return false
        break
      }
      case 'older_than': {
        const days = parseInt(cond.value, 10)
        if (isNaN(days)) return false
        const cutoff = Date.now() - days * 86_400_000
        if (stats.mtimeMs > cutoff) return false
        break
      }
      case 'newer_than': {
        const days = parseInt(cond.value, 10)
        if (isNaN(days)) return false
        const cutoff = Date.now() - days * 86_400_000
        if (stats.mtimeMs < cutoff) return false
        break
      }
    }
  }
  return true
}
