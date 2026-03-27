import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

export function registerExcelToolHandlers(): void {
  ipcMain.handle('excelTool:openFiles', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'Spreadsheet', extensions: ['xlsx', 'xls', 'csv'] }],
      properties: ['openFile', 'multiSelections']
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('excelTool:openOutputDir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('excelTool:defaultOutputDir', () => app.getPath('desktop'))

  ipcMain.handle('excelTool:readFile', async (_, filePath: string) => {
    try {
      const buf = fs.readFileSync(filePath)
      const encoding = filePath.toLowerCase().endsWith('.csv') ? { type: 'buffer' as const } : { type: 'buffer' as const }
      const wb = XLSX.read(buf, encoding)
      const sheets: Record<string, unknown[][]> = {}
      for (const name of wb.SheetNames) {
        sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }) as unknown[][]
      }
      return { success: true, sheets, sheetNames: wb.SheetNames, fileName: path.basename(filePath) }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('excelTool:exportCsv', async (_, data: unknown[][], outputPath: string) => {
    try {
      const ws = XLSX.utils.aoa_to_sheet(data)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      // BOM for Korean compatibility
      fs.writeFileSync(outputPath, '\uFEFF' + csv, 'utf8')
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('excelTool:exportXlsx', async (_, sheets: Record<string, unknown[][]>, outputPath: string) => {
    try {
      const wb = XLSX.utils.book_new()
      for (const [name, data] of Object.entries(sheets)) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), name)
      }
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      XLSX.writeFile(wb, outputPath)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}
