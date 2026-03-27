import { ipcMain, dialog, app, shell, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { PDFDocument } from 'pdf-lib'

export function registerPdfToolHandlers(): void {
  ipcMain.handle('pdfTool:openFiles', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections']
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('pdfTool:openOutputDir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('pdfTool:defaultOutputDir', () => {
    return app.getPath('desktop')
  })

  ipcMain.handle('pdfTool:merge', async (_, files: string[], outputPath: string) => {
    try {
      const merged = await PDFDocument.create()
      for (const file of files) {
        const bytes = fs.readFileSync(file)
        const pdf = await PDFDocument.load(bytes)
        const pages = await merged.copyPages(pdf, pdf.getPageIndices())
        pages.forEach(p => merged.addPage(p))
      }
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(outputPath, await merged.save())
      return { success: true, outputPath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('pdfTool:split', async (_, file: string, outputDir: string) => {
    try {
      const bytes = fs.readFileSync(file)
      const pdf = await PDFDocument.load(bytes)
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
      return { success: true, files: outputs, pageCount }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('pdfTool:openFile', async (_, filePath: string) => {
    await shell.openPath(filePath)
  })
}
