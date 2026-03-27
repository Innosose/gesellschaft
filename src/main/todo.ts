import { ipcMain, app } from 'electron'
import { join } from 'path'
import fs from 'fs'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  priority: 'high' | 'normal'
  dueDate?: string
  createdAt: number
}

let todos: TodoItem[] = []

function getPath(): string {
  return join(app.getPath('userData'), 'todos.json')
}

function load(): void {
  try {
    if (fs.existsSync(getPath())) {
      todos = JSON.parse(fs.readFileSync(getPath(), 'utf-8'))
    }
  } catch { todos = [] }
}

function save(): void {
  try { fs.writeFileSync(getPath(), JSON.stringify(todos), 'utf-8') } catch { /* ignore */ }
}

export function registerTodoHandlers(): void {
  load()

  ipcMain.handle('todo:get', () => todos)

  ipcMain.handle('todo:add', (_, item: Omit<TodoItem, 'id' | 'createdAt'>) => {
    todos.unshift({ ...item, id: Date.now().toString(), createdAt: Date.now() })
    save()
    return todos
  })

  ipcMain.handle('todo:toggle', (_, id: string) => {
    const item = todos.find(t => t.id === id)
    if (item) { item.done = !item.done; save() }
    return todos
  })

  ipcMain.handle('todo:delete', (_, id: string) => {
    todos = todos.filter(t => t.id !== id)
    save()
    return todos
  })

  ipcMain.handle('todo:clearDone', () => {
    todos = todos.filter(t => !t.done)
    save()
    return todos
  })

  ipcMain.handle('todo:update', (_, id: string, text: string, priority: 'high' | 'normal', dueDate?: string) => {
    const item = todos.find(t => t.id === id)
    if (item) { item.text = text; item.priority = priority; item.dueDate = dueDate; save() }
    return todos
  })
}
