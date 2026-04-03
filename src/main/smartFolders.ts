import { app } from 'electron'
import path from 'path'
import { z } from 'zod'
import { createCrudStore } from './createCrudStore'

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

const SmartFolderSchema = z.object({
  id:   z.string().min(1),
  name: z.string().min(1).max(200),
  options: z.object({
    query:         z.string().max(500),
    rootPath:      z.string().min(1),
    extensions:    z.array(z.string()).optional(),
    minSize:       z.number().nonnegative().optional(),
    maxSize:       z.number().nonnegative().optional(),
    includeFiles:  z.boolean(),
    includeDirs:   z.boolean(),
    caseSensitive: z.boolean().optional(),
    regex:         z.boolean().optional(),
    contentSearch: z.boolean().optional(),
  }),
})

const store = createCrudStore<SmartFolder>({
  channel: 'smartFolders',
  getPath: () => path.join(app.getPath('userData'), 'smartFolders.json'),
  saveSchema: SmartFolderSchema,
  uncached: true,
  createItem: (data) => data as unknown as SmartFolder,
  updateItem: (_existing, data) => data as unknown as SmartFolder,
})

export function registerSmartFoldersHandlers(): void {
  store.register()
}
