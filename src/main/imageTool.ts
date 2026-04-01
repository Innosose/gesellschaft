import { ipcMain, dialog, app } from 'electron'
import { getWinFromEvent } from './windowUtil'
import * as fs from 'fs'
import * as path from 'path'
// Lazy-loaded to avoid startup cost — Jimp is heavy
let _Jimp: typeof import('jimp').default | null = null
async function getJimp(): Promise<typeof import('jimp').default> {
  if (!_Jimp) { _Jimp = (await import('jimp')).default }
  return _Jimp
}
import { z } from 'zod'
import log, { logIpcError } from './logger'

const ConvertJobSchema = z.object({
  filePath:   z.string().min(1),
  outputDir:  z.string().min(1),
  format:     z.enum(['jpg', 'png', 'bmp']),
  quality:    z.number().int().min(1).max(100),
  width:      z.number().int().min(0),
  height:     z.number().int().min(0),
  keepAspect: z.boolean(),
})

const ConvertJobsSchema = z.array(ConvertJobSchema).min(1).max(200)

export function registerImageToolHandlers(): void {
  ipcMain.handle('imageTool:openFiles', async (event) => {
    const win = getWinFromEvent(event)
    const result = await dialog.showOpenDialog(win, {
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'tif'] }],
      properties: ['openFile', 'multiSelections'],
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('imageTool:openOutputDir', async (event) => {
    const win = getWinFromEvent(event)
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('imageTool:defaultOutputDir', () =>
    path.join(app.getPath('desktop'), 'Image_Converted')
  )

  ipcMain.handle('imageTool:convert', async (_, rawJobs: unknown) => {
    const parsed = ConvertJobsSchema.safeParse(rawJobs)
    if (!parsed.success) {
      log.warn('[imageTool:convert] 유효하지 않은 입력', parsed.error.flatten())
      return [{ filePath: '', success: false, error: '유효하지 않은 변환 작업' }]
    }

    const results: { filePath: string; success: boolean; outputPath?: string; error?: string }[] = []
    const Jimp = await getJimp()

    for (const job of parsed.data) {
      try {
        if (!fs.existsSync(job.outputDir)) fs.mkdirSync(job.outputDir, { recursive: true })

        const img = await Jimp.read(job.filePath)

        if (job.width > 0 || job.height > 0) {
          const w = job.width  > 0 ? job.width  : Jimp.AUTO
          const h = job.height > 0 ? job.height : Jimp.AUTO
          if (job.keepAspect) {
            img.scaleToFit(job.width > 0 ? job.width : 999999, job.height > 0 ? job.height : 999999)
          } else {
            img.resize(w, h)
          }
        }

        img.quality(job.quality)

        const baseName = path.basename(job.filePath, path.extname(job.filePath))
        const outPath  = path.join(job.outputDir, `${baseName}.${job.format}`)
        await img.writeAsync(outPath)
        results.push({ filePath: job.filePath, success: true, outputPath: outPath })
      } catch (err) {
        logIpcError('imageTool:convert', err, { filePath: job.filePath })
        results.push({ filePath: job.filePath, success: false, error: err instanceof Error ? err.message : String(err) })
      }
    }

    log.info(`[imageTool:convert] ${results.filter(r => r.success).length}/${results.length} 성공`)
    return results
  })
}
