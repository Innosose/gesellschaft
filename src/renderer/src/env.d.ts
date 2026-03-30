/// <reference types="vite/client" />

interface OrganizeRule {
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

interface ApiResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

interface SmartFolder {
  id: string
  name: string
  options: {
    query: string
    rootPath: string
    extensions?: string[]
    minSize?: number
    maxSize?: number
    includeFiles: boolean
    includeDirs: boolean
    caseSensitive?: boolean
    regex?: boolean
    contentSearch?: boolean
  }
}

declare global {
  interface Window {
    api: {
      window: {
        hide: () => void
        minimize: () => void
        close: () => void
        setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void
      }
      appCtrl: {
        getLoginItem: () => Promise<boolean>
        setLoginItem: (enable: boolean) => Promise<{ success: boolean }>
      }
      dialog: {
        openDirectory: () => Promise<string | null>
      }
      fs: {
        readDir: (dirPath: string) => Promise<ApiResult<{ name: string; path: string; isDirectory: boolean; size: number; modified: number; created: number; extension: string; mimeType: string | false; tags?: string[] }[]>>
        homeDir: () => Promise<string>
        delete: (paths: string[]) => Promise<ApiResult>
        bulkRename: (items: { path: string; newName: string }[]) => Promise<{ path: string; success: boolean; newPath?: string; error?: string }[]>
        folderSize: (dirPath: string) => Promise<ApiResult & { size: number }>
        typeStats: (dirPath: string) => Promise<ApiResult<Record<string, { count: number; size: number }>>>
        open: (filePath: string) => Promise<ApiResult>
        showInExplorer: (filePath: string) => Promise<ApiResult>
      }
      search: {
        files: (options: unknown) => Promise<ApiResult<import('./components/SearchModal').SearchResult[]>>
        cancel: () => void
        onProgress: (cb: (count: number) => void) => () => void
      }
      cadConvert: {
        openFiles: () => Promise<string[]>
        openOutputDir: () => Promise<string | null>
        defaultOutputDir: () => Promise<string>
        convert: (files: string[], outputDir: string) => Promise<{ inputPath: string; outputPath?: string; success: boolean; error?: string }[]>
        openPdf: (pdfPath: string) => Promise<void>
        onProgress: (cb: (info: { filePath: string; status: string; outputPath?: string; error?: string }) => void) => () => void
      }
      tags: {
        get: (filePath: string) => Promise<string[]>
        set: (filePath: string, tags: string[]) => Promise<ApiResult>
        getAllTags: () => Promise<string[]>
        findByTag: (tag: string) => Promise<string[]>
      }
      notes: {
        get: (filePath: string) => Promise<string>
        set: (filePath: string, note: string) => Promise<ApiResult>
      }
      organize: {
        getRules: () => Promise<OrganizeRule[]>
        saveRule: (rule: OrganizeRule) => Promise<ApiResult>
        deleteRule: (ruleId: string) => Promise<ApiResult>
        runRule: (rule: OrganizeRule) => Promise<ApiResult & { results: { file: string; action: string; success: boolean; error?: string }[] }>
      }
      smartFolders: {
        get: () => Promise<SmartFolder[]>
        save: (folder: SmartFolder) => Promise<SmartFolder[]>
        delete: (id: string) => Promise<SmartFolder[]>
      }
      folderCompare: {
        compare: (pathA: string, pathB: string) => Promise<ApiResult<{
          relativePath: string
          name: string
          status: 'only_a' | 'only_b' | 'modified' | 'same'
          sizeA?: number
          sizeB?: number
          modifiedA?: number
          modifiedB?: number
        }[]>>
      }
      reminders: {
        get: () => Promise<{
          id: string; filePath: string; fileName: string
          note: string; remindAt: number; done: boolean
        }[]>
        add: (r: { filePath: string; fileName: string; note: string; remindAt: number }) => Promise<{
          id: string; filePath: string; fileName: string
          note: string; remindAt: number; done: boolean
        }[]>
        delete: (id: string) => Promise<{ id: string; filePath: string; fileName: string; note: string; remindAt: number; done: boolean }[]>
        markDone: (id: string) => Promise<{ id: string; filePath: string; fileName: string; note: string; remindAt: number; done: boolean }[]>
      }
      clipboard: {
        getHistory: () => Promise<string[]>
        copy: (text: string) => Promise<boolean>
        remove: (text: string) => Promise<string[]>
        clear: () => Promise<string[]>
        onUpdated: (cb: (history: string[]) => void) => () => void
      }
      todo: {
        get: () => Promise<{ id: string; text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string; createdAt: number }[]>
        add: (item: { text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string }) => Promise<{ id: string; text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string; createdAt: number }[]>
        toggle: (id: string) => Promise<{ id: string; text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string; createdAt: number }[]>
        delete: (id: string) => Promise<{ id: string; text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string; createdAt: number }[]>
        clearDone: () => Promise<{ id: string; text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string; createdAt: number }[]>
      }
      quickNotes: {
        get: () => Promise<{ id: string; title: string; content: string; color: string; updatedAt: number }[]>
        save: (note: { id?: string; title?: string; content?: string; color?: string }) => Promise<{ id: string; title: string; content: string; color: string; updatedAt: number }[]>
        delete: (id: string) => Promise<{ id: string; title: string; content: string; color: string; updatedAt: number }[]>
      }
      pdfTool: {
        openFiles: () => Promise<string[]>
        openOutputDir: () => Promise<string | null>
        defaultOutputDir: () => Promise<string>
        merge: (files: string[], outputPath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
        split: (file: string, outputDir: string) => Promise<{ success: boolean; files?: string[]; pageCount?: number; error?: string }>
        openFile: (filePath: string) => Promise<void>
      }
      imageTool: {
        openFiles: () => Promise<string[]>
        openOutputDir: () => Promise<string | null>
        defaultOutputDir: () => Promise<string>
        convert: (jobs: { filePath: string; outputDir: string; format: string; quality: number; width: number; height: number; keepAspect: boolean }[]) => Promise<{ filePath: string; success: boolean; outputPath?: string; error?: string }[]>
      }
      excelTool: {
        openFiles: () => Promise<string[]>
        openOutputDir: () => Promise<string | null>
        defaultOutputDir: () => Promise<string>
        readFile: (filePath: string) => Promise<{ success: boolean; sheets?: Record<string, unknown[][]>; sheetNames?: string[]; fileName?: string; error?: string }>
        exportCsv: (data: unknown[][], outputPath: string) => Promise<{ success: boolean; error?: string }>
        exportXlsx: (sheets: Record<string, unknown[][]>, outputPath: string) => Promise<{ success: boolean; error?: string }>
      }
      settings: {
        getShortcut: () => Promise<string>
        setShortcut: (shortcut: string) => Promise<{ success: boolean; shortcut?: string; error?: string }>
        getTheme: () => Promise<string>
        setTheme: (color: string) => Promise<{ success: boolean }>
        getDisplay: () => Promise<{ hubSize: number; overlayOpacity: number; spiralScale: number; animSpeed: string }>
        setDisplay: (patch: Record<string, unknown>) => Promise<{ success: boolean }>
      }
      screen: {
        captureAndAnalyze: () => Promise<{ success: boolean; recommendations: string[]; reasons: Record<string, string>; error?: string }>
      }
      ai: {
        getConfig: () => Promise<{ provider: string; apiKey: string; model: string; systemPrompt: string; ollamaUrl: string }>
        setConfig: (patch: Record<string, unknown>) => Promise<{ success: boolean }>
        getPresetModels: () => Promise<Record<string, string[]>>
        getOllamaModels: () => Promise<string[]>
        chat: (messages: { role: string; content: string }[]) => Promise<void>
        cancel: () => Promise<void>
        onChunk: (cb: (text: string) => void) => () => void
        onDone: (cb: () => void) => () => void
        onError: (cb: (msg: string) => void) => () => void
      }
    }
  }
}
