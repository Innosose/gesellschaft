import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Window controls
  window: {
    hide: () => ipcRenderer.send('window:hide'),
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
      ipcRenderer.send('window:setIgnoreMouseEvents', ignore, options),
  },

  // App (login item)
  appCtrl: {
    getLoginItem: () => ipcRenderer.invoke('app:getLoginItem'),
    setLoginItem: (enable: boolean) => ipcRenderer.invoke('app:setLoginItem', enable),
  },

  // Dialog
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
  },

  // File System
  fs: {
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
    homeDir: () => ipcRenderer.invoke('fs:homeDir'),
    delete: (paths: string[]) => ipcRenderer.invoke('fs:delete', paths),
    bulkRename: (items: { path: string; newName: string }[]) =>
      ipcRenderer.invoke('fs:bulkRename', items),
    folderSize: (dirPath: string) => ipcRenderer.invoke('fs:folderSize', dirPath),
    typeStats: (dirPath: string) => ipcRenderer.invoke('fs:typeStats', dirPath),
    onFolderSizeProgress: (cb: (scanned: number) => void) => {
      const handler = (_: Electron.IpcRendererEvent, scanned: number): void => cb(scanned)
      ipcRenderer.on('fs:folderSize:progress', handler)
      return () => ipcRenderer.removeListener('fs:folderSize:progress', handler)
    },
    onTypeStatsProgress: (cb: (scanned: number) => void) => {
      const handler = (_: Electron.IpcRendererEvent, scanned: number): void => cb(scanned)
      ipcRenderer.on('fs:typeStats:progress', handler)
      return () => ipcRenderer.removeListener('fs:typeStats:progress', handler)
    },
    open: (filePath: string) => ipcRenderer.invoke('fs:open', filePath),
    showInExplorer: (filePath: string) => ipcRenderer.invoke('fs:showInExplorer', filePath)
  },

  // Search
  search: {
    files: (options: unknown) => ipcRenderer.invoke('search:files', options),
    cancel: () => ipcRenderer.send('search:cancel'),
    onProgress: (cb: (count: number) => void) => {
      const handler = (_: Electron.IpcRendererEvent, count: number): void => cb(count)
      ipcRenderer.on('search:progress', handler)
      return () => ipcRenderer.removeListener('search:progress', handler)
    }
  },

  // CAD → PDF 변환
  cadConvert: {
    openFiles: () => ipcRenderer.invoke('cadConvert:openFiles'),
    openOutputDir: () => ipcRenderer.invoke('cadConvert:openOutputDir'),
    defaultOutputDir: () => ipcRenderer.invoke('cadConvert:defaultOutputDir'),
    convert: (files: string[], outputDir: string) =>
      ipcRenderer.invoke('cadConvert:convert', files, outputDir),
    openPdf: (pdfPath: string) => ipcRenderer.invoke('cadConvert:openPdf', pdfPath),
    onProgress: (cb: (info: { filePath: string; status: string; outputPath?: string; error?: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, info: { filePath: string; status: string; outputPath?: string; error?: string }): void => cb(info)
      ipcRenderer.on('cadConvert:progress', handler)
      return () => ipcRenderer.removeListener('cadConvert:progress', handler)
    }
  },

  // Tags
  tags: {
    get: (filePath: string) => ipcRenderer.invoke('tags:get', filePath),
    set: (filePath: string, tags: string[]) => ipcRenderer.invoke('tags:set', filePath, tags),
    getAllTags: () => ipcRenderer.invoke('tags:getAllTags'),
    findByTag: (tag: string) => ipcRenderer.invoke('tags:findByTag', tag)
  },

  // Notes
  notes: {
    get: (filePath: string) => ipcRenderer.invoke('notes:get', filePath),
    set: (filePath: string, note: string) => ipcRenderer.invoke('notes:set', filePath, note)
  },

  // Auto organize
  organize: {
    getRules: () => ipcRenderer.invoke('organize:getRules'),
    saveRule: (rule: unknown) => ipcRenderer.invoke('organize:saveRule', rule),
    deleteRule: (ruleId: string) => ipcRenderer.invoke('organize:deleteRule', ruleId),
    runRule: (rule: unknown) => ipcRenderer.invoke('organize:runRule', rule)
  },

  // Smart Folders
  smartFolders: {
    get: () => ipcRenderer.invoke('smartFolders:get'),
    save: (folder: unknown) => ipcRenderer.invoke('smartFolders:save', folder),
    delete: (id: string) => ipcRenderer.invoke('smartFolders:delete', id)
  },

  // Folder Compare
  folderCompare: {
    compare: (pathA: string, pathB: string) =>
      ipcRenderer.invoke('folderCompare:compare', pathA, pathB)
  },

  // Reminders
  reminders: {
    get: () => ipcRenderer.invoke('reminders:get'),
    add: (reminder: { filePath: string; fileName: string; note: string; remindAt: number }) =>
      ipcRenderer.invoke('reminders:add', reminder),
    delete: (id: string) => ipcRenderer.invoke('reminders:delete', id),
    markDone: (id: string) => ipcRenderer.invoke('reminders:markDone', id)
  },

  // Clipboard history
  clipboard: {
    getHistory: () => ipcRenderer.invoke('clipboard:getHistory'),
    copy: (text: string) => ipcRenderer.invoke('clipboard:copy', text),
    remove: (text: string) => ipcRenderer.invoke('clipboard:remove', text),
    clear: () => ipcRenderer.invoke('clipboard:clear'),
    onUpdated: (cb: (history: string[]) => void) => {
      const handler = (_: Electron.IpcRendererEvent, h: string[]): void => cb(h)
      ipcRenderer.on('clipboard:updated', handler)
      return () => ipcRenderer.removeListener('clipboard:updated', handler)
    }
  },

  // Todo
  todo: {
    get: () => ipcRenderer.invoke('todo:get'),
    add: (item: { text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string }) =>
      ipcRenderer.invoke('todo:add', item),
    toggle: (id: string) => ipcRenderer.invoke('todo:toggle', id),
    delete: (id: string) => ipcRenderer.invoke('todo:delete', id),
    clearDone: () => ipcRenderer.invoke('todo:clearDone')
  },

  // Quick Notes
  quickNotes: {
    get: () => ipcRenderer.invoke('quickNotes:get'),
    save: (note: { id?: string; title?: string; content?: string; color?: string }) =>
      ipcRenderer.invoke('quickNotes:save', note),
    delete: (id: string) => ipcRenderer.invoke('quickNotes:delete', id)
  },

  // PDF Tool
  pdfTool: {
    openFiles: () => ipcRenderer.invoke('pdfTool:openFiles'),
    openOutputDir: () => ipcRenderer.invoke('pdfTool:openOutputDir'),
    defaultOutputDir: () => ipcRenderer.invoke('pdfTool:defaultOutputDir'),
    merge: (files: string[], outputPath: string) => ipcRenderer.invoke('pdfTool:merge', files, outputPath),
    split: (file: string, outputDir: string) => ipcRenderer.invoke('pdfTool:split', file, outputDir),
    openFile: (filePath: string) => ipcRenderer.invoke('pdfTool:openFile', filePath)
  },

  // Image Tool
  imageTool: {
    openFiles: () => ipcRenderer.invoke('imageTool:openFiles'),
    openOutputDir: () => ipcRenderer.invoke('imageTool:openOutputDir'),
    defaultOutputDir: () => ipcRenderer.invoke('imageTool:defaultOutputDir'),
    convert: (jobs: { filePath: string; outputDir: string; format: string; quality: number; width: number; height: number; keepAspect: boolean }[]) =>
      ipcRenderer.invoke('imageTool:convert', jobs)
  },

  // Excel Tool
  excelTool: {
    openFiles: () => ipcRenderer.invoke('excelTool:openFiles'),
    loadFile: (filePath: string) => ipcRenderer.invoke('excelTool:loadFile', filePath),
    loadSheet: (filePath: string, sheet: string) => ipcRenderer.invoke('excelTool:loadSheet', filePath, sheet),
    openOutputPath: (format: string) => ipcRenderer.invoke('excelTool:openOutputPath', format),
    export: (opts: { filePath: string; sheet: string; columns: string[]; filterText: string; outputFormat: string; outputPath: string }) =>
      ipcRenderer.invoke('excelTool:export', opts),
  },

  // App Settings
  settings: {
    getShortcut: () => ipcRenderer.invoke('settings:getShortcut'),
    setShortcut: (shortcut: string) => ipcRenderer.invoke('settings:setShortcut', shortcut),
    getTheme: () => ipcRenderer.invoke('settings:getTheme'),
    setTheme: (color: string) => ipcRenderer.invoke('settings:setTheme', color),
    getDisplay: () => ipcRenderer.invoke('settings:getDisplay'),
    setDisplay: (patch: Record<string, unknown>) => ipcRenderer.invoke('settings:setDisplay', patch),
  },

  // Screen Capture + AI Analysis
  screen: {
    captureAndAnalyze: () => ipcRenderer.invoke('screen:captureAndAnalyze'),
  },

  // Snippets
  snippets: {
    get: () => ipcRenderer.invoke('snippets:get'),
    save: (snippet: { id?: string; title?: string; content?: string; tags?: string[] }) =>
      ipcRenderer.invoke('snippets:save', snippet),
    delete: (id: string) => ipcRenderer.invoke('snippets:delete', id),
  },

  // Email Templates
  emailTemplates: {
    get: () => ipcRenderer.invoke('emailTemplates:get'),
    save: (template: { id?: string; name?: string; subject?: string; body?: string }) =>
      ipcRenderer.invoke('emailTemplates:save', template),
    delete: (id: string) => ipcRenderer.invoke('emailTemplates:delete', id),
  },

  // Pomodoro
  pomodoro: {
    getStats: () => ipcRenderer.invoke('pomodoro:getStats'),
    saveSession: (session: { date: string; completedPomodoros: number; totalFocusMinutes: number }) =>
      ipcRenderer.invoke('pomodoro:saveSession', session),
    clearStats: () => ipcRenderer.invoke('pomodoro:clearStats'),
  },

  // AI Assistant
  ai: {
    getConfig: () => ipcRenderer.invoke('ai:getConfig'),
    setConfig: (patch: Record<string, unknown>) => ipcRenderer.invoke('ai:setConfig', patch),
    getPresetModels: () => ipcRenderer.invoke('ai:getPresetModels'),
    getOllamaModels: () => ipcRenderer.invoke('ai:getOllamaModels'),
    chat: (messages: { role: string; content: string }[]) => ipcRenderer.invoke('ai:chat', messages),
    cancel: () => ipcRenderer.invoke('ai:cancel'),
    onChunk: (cb: (text: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, text: string): void => cb(text)
      ipcRenderer.on('ai:chunk', handler)
      return () => ipcRenderer.removeListener('ai:chunk', handler)
    },
    onDone: (cb: () => void) => {
      const handler = (): void => cb()
      ipcRenderer.on('ai:done', handler)
      return () => ipcRenderer.removeListener('ai:done', handler)
    },
    onError: (cb: (msg: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, msg: string): void => cb(msg)
      ipcRenderer.on('ai:error', handler)
      return () => ipcRenderer.removeListener('ai:error', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
