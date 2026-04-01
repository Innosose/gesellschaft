import { ipcMain, app } from 'electron'
import { join } from 'path'
import { z } from 'zod'
import log, { logIpcError } from './logger'
import { readJsonSync, writeJsonLocked } from './jsonStore'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  priority: 'high' | 'normal'
  dueDate?: string
  createdAt: number
}

// ── Zod 스키마 ──────────────────────────────────
const TodoAddSchema = z.object({
  text:     z.string().min(1).max(1000),
  done:     z.boolean(),
  priority: z.enum(['high', 'normal']),
  dueDate:  z.string().optional(),
})

const TodoUpdateSchema = z.object({
  id:       z.string().min(1),
  text:     z.string().min(1).max(1000),
  priority: z.enum(['high', 'normal']),
  dueDate:  z.string().optional(),
})
// ────────────────────────────────────────────────

let todos: TodoItem[] = []

function getPath(): string {
  return join(app.getPath('userData'), 'todos.json')
}

function load(): void {
  const raw = readJsonSync<unknown>(getPath(), [])
  todos = Array.isArray(raw) ? raw : []
  log.debug(`[todo] ${todos.length}개 로드`)
}

async function save(): Promise<void> {
  try {
    await writeJsonLocked(getPath(), todos)
  } catch (err) {
    log.error('[todo] 파일 저장 실패', err)
  }
}

export function registerTodoHandlers(): void {
  load()

  ipcMain.handle('todo:get', () => todos)

  ipcMain.handle('todo:add', async (_, raw: unknown) => {
    const result = TodoAddSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[todo:add] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 할일 데이터' }
    }
    const item = result.data
    todos.unshift({ ...item, id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() })
    await save()
    log.debug(`[todo:add] 추가됨: "${item.text.slice(0, 40)}"`)
    return todos
  })

  ipcMain.handle('todo:toggle', async (_, id: unknown) => {
    if (typeof id !== 'string' || !id) return { success: false, error: '유효하지 않은 id' }
    const item = todos.find(t => t.id === id)
    if (item) {
      item.done = !item.done
      await save()
      log.debug(`[todo:toggle] id=${id} done=${item.done}`)
    }
    return todos
  })

  ipcMain.handle('todo:delete', async (_, id: unknown) => {
    if (typeof id !== 'string' || !id) return { success: false, error: '유효하지 않은 id' }
    todos = todos.filter(t => t.id !== id)
    await save()
    log.debug(`[todo:delete] id=${id}`)
    return todos
  })

  ipcMain.handle('todo:clearDone', async () => {
    const before = todos.length
    todos = todos.filter(t => !t.done)
    await save()
    log.debug(`[todo:clearDone] ${before - todos.length}개 삭제`)
    return todos
  })

  ipcMain.handle('todo:update', async (_, rawId: unknown, rawText: unknown, rawPriority: unknown, rawDue?: unknown) => {
    const result = TodoUpdateSchema.safeParse({
      id: rawId, text: rawText, priority: rawPriority, dueDate: rawDue ?? undefined,
    })
    if (!result.success) {
      log.warn('[todo:update] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 데이터' }
    }
    const { id, text, priority, dueDate } = result.data
    const item = todos.find(t => t.id === id)
    if (item) {
      item.text = text
      item.priority = priority
      item.dueDate = dueDate
      await save()
      log.debug(`[todo:update] id=${id}`)
    }
    return todos
  })

  // 예외 감시 (미처리 에러 로깅용)
  process.on('uncaughtException', (err) => {
    logIpcError('uncaughtException', err)
  })
}
