import { ipcMain, app } from 'electron'
import { join } from 'path'
import { z } from 'zod'
import log from './logger'
import { createCrudStore, generateId } from './createCrudStore'

interface TodoItem {
  id: string
  text: string
  done: boolean
  priority: 'high' | 'normal'
  dueDate?: string
  createdAt: number
}

const TodoSaveSchema = z.object({
  id:       z.string().optional(),
  text:     z.string().min(1).max(1000),
  done:     z.boolean().optional(),
  priority: z.enum(['high', 'normal']),
  dueDate:  z.string().optional(),
})

const store = createCrudStore<TodoItem>({
  channel: 'todo',
  getPath: () => join(app.getPath('userData'), 'todos.json'),
  saveSchema: TodoSaveSchema,
  createItem: (data) => ({
    id: generateId('todo'),
    text: data.text as string,
    done: (data.done as boolean) ?? false,
    priority: data.priority as 'high' | 'normal',
    dueDate: data.dueDate as string | undefined,
    createdAt: Date.now(),
  }),
  updateItem: (existing, data) => ({
    ...existing,
    text: (data.text as string) ?? existing.text,
    priority: (data.priority as 'high' | 'normal') ?? existing.priority,
    dueDate: data.dueDate as string | undefined,
  }),
})

export function registerTodoHandlers(): void {
  store.register()

  ipcMain.handle('todo:toggle', async (_, id: unknown) => {
    if (typeof id !== 'string' || !id) return { success: false, error: '유효하지 않은 id' }
    const items = store.getItems()
    const item = items.find(t => t.id === id)
    if (item) {
      item.done = !item.done
      log.debug(`[todo:toggle] id=${id} done=${item.done}`)
    }
    return items
  })

  ipcMain.handle('todo:clearDone', async () => {
    const items = store.getItems()
    const remaining = items.filter(t => !t.done)
    log.debug(`[todo:clearDone] ${items.length - remaining.length}개 삭제`)
    // Directly mutate the store's array reference
    items.length = 0
    items.push(...remaining)
    return items
  })
}
