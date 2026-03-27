import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import Jimp from 'jimp'

interface ConvertJob {
  filePath: string
  outputDir: string
  format: 'jpg' | 'png' | 'bmp'
  quality: number
  width: number   // 0 = no resize
  height: number  // 0 = no resize
  keepAspect: boolean
}

export function registerImageToolHandlers(): void {
  ipcMain.handle('imageTool:openFiles', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'tif'] }],
      properties: ['openFile', 'multiSelections']
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('imageTool:openOutputDir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('imageTool:defaultOutputDir', () => {
    return path.join(app.getPath('desktop'), 'Image_Converted')
  })

  ipcMain.handle('imageTool:convert', async (_, jobs: ConvertJob[]) => {
    const results: { filePath: string; success: boolean; outputPath?: string; error?: string }[] = []

    for (const job of jobs) {
      try {
        if (!fs.existsSync(job.outputDir)) fs.mkdirSync(job.outputDir, { recursive: true })

        const img = await Jimp.read(job.filePath)

        if (job.width > 0 || job.height > 0) {
          const w = job.width > 0 ? job.width : Jimp.AUTO
          const h = job.height > 0 ? job.height : Jimp.AUTO
          if (job.keepAspect) {
            img.scaleToFit(job.width > 0 ? job.width : 999999, job.height > 0 ? job.height : 999999)
          } else {
            img.resize(w, h)
          }
        }

        const mimeMap: Record<string, string> = {
          jpg: Jimp.MIME_JPEG,
          png: Jimp.MIME_PNG,
          bmp: Jimp.MIME_BMP
        }
        img.quality(job.quality)

        const baseName = path.basename(job.filePath, path.extname(job.filePath))
        const outPath = path.join(job.outputDir, `${baseName}.${job.format}`)
        await img.writeAsync(outPath)
        results.push({ filePath: job.filePath, success: true, outputPath: outPath })
      } catch (e: any) {
        results.push({ filePath: job.filePath, success: false, error: e.message })
      }
    }
    return results
  })
}
