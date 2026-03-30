import { ipcMain, dialog, app, shell, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { PDFDocument } from 'pdf-lib'
import { z } from 'zod'
import log, { logIpcError } from './logger'

const FilePathSchema  = z.string().min(1)
const FilePathsSchema = z.array(z.string().min(1)).min(1)

export function registerPdfToolHandlers(): void {
  ipcMain.handle('pdfTool:openFiles', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections'],
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('pdfTool:openOutputDir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('pdfTool:defaultOutputDir', () => app.getPath('desktop'))

  ipcMain.handle('pdfTool:merge', async (_, rawFiles: unknown, rawOutput: unknown) => {
    const filesResult  = FilePathsSchema.safeParse(rawFiles)
    const outputResult = FilePathSchema.safeParse(rawOutput)
    if (!filesResult.success || !outputResult.success) {
      return { success: false, error: '유효하지 않은 파일 경로' }
    }
    const files      = filesResult.data
    const outputPath = outputResult.data
    try {
      const merged = await PDFDocument.create()
      for (const file of files) {
        const bytes = fs.readFileSync(file)
        const pdf   = await PDFDocument.load(bytes)
        const pages = await merged.copyPages(pdf, pdf.getPageIndices())
        pages.forEach(p => merged.addPage(p))
      }
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(outputPath, await merged.save())
      log.info(`[pdfTool:merge] ${files.length}개 병합 → ${outputPath}`)
      return { success: true, outputPath }
    } catch (err) {
      logIpcError('pdfTool:merge', err, { files, outputPath })
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('pdfTool:split', async (_, rawFile: unknown, rawOutputDir: unknown) => {
    const fileResult   = FilePathSchema.safeParse(rawFile)
    const outputResult = FilePathSchema.safeParse(rawOutputDir)
    if (!fileResult.success || !outputResult.success) {
      return { success: false, error: '유효하지 않은 파일 경로' }
    }
    const file      = fileResult.data
    const outputDir = outputResult.data
    try {
      const bytes     = fs.readFileSync(file)
      const pdf       = await PDFDocument.load(bytes)
      const pageCount = pdf.getPageCount()
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
      const baseName = path.basename(file, '.pdf')
      const outputs: string[] = []
      for (let i = 0; i < pageCount; i++) {
        const single = await PDFDocument.create()
        const [page] = await single.copyPages(pdf, [i])
        single.addPage(page)
        const outPath = path.join(outputDir, `${baseName}_p${i + 1}.pdf`)
        fs.writeFileSync(outPath, await single.save())
        outputs.push(outPath)
      }
      log.info(`[pdfTool:split] ${pageCount}페이지 분할 → ${outputDir}`)
      return { success: true, files: outputs, pageCount }
    } catch (err) {
      logIpcError('pdfTool:split', err, { file, outputDir })
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('pdfTool:openFile', async (_, rawPath: unknown) => {
    const result = FilePathSchema.safeParse(rawPath)
    if (!result.success) return
    await shell.openPath(result.data)
  })
}
