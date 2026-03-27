import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import log, { logIpcError } from './logger'

const FilePathSchema = z.string().min(1)

export function registerExcelToolHandlers(): void {
  ipcMain.handle('excelTool:openFiles', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'Spreadsheet', extensions: ['xlsx', 'xls', 'csv'] }],
      properties: ['openFile', 'multiSelections'],
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('excelTool:openOutputDir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('excelTool:defaultOutputDir', () => app.getPath('desktop'))

  ipcMain.handle('excelTool:readFile', async (_, rawPath: unknown) => {
    const result = FilePathSchema.safeParse(rawPath)
    if (!result.success) return { success: false, error: '유효하지 않은 파일 경로' }
    const filePath = result.data
    try {
      const buf      = fs.readFileSync(filePath)
      const wb       = XLSX.read(buf, { type: 'buffer' })
      const sheets: Record<string, unknown[][]> = {}
      for (const name of wb.SheetNames) {
        sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }) as unknown[][]
      }
      log.debug(`[excelTool:readFile] ${wb.SheetNames.length}개 시트 로드: ${path.basename(filePath)}`)
      return { success: true, sheets, sheetNames: wb.SheetNames, fileName: path.basename(filePath) }
    } catch (err) {
      logIpcError('excelTool:readFile', err, { filePath })
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('excelTool:exportCsv', async (_, data: unknown, rawOutput: unknown) => {
    const outputResult = FilePathSchema.safeParse(rawOutput)
    if (!outputResult.success || !Array.isArray(data)) {
      return { success: false, error: '유효하지 않은 입력' }
    }
    const outputPath = outputResult.data
    try {
      const ws  = XLSX.utils.aoa_to_sheet(data as unknown[][])
      const csv = XLSX.utils.sheet_to_csv(ws)
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(outputPath, '\uFEFF' + csv, 'utf8') // BOM for Korean
      log.info(`[excelTool:exportCsv] → ${outputPath}`)
      return { success: true }
    } catch (err) {
      logIpcError('excelTool:exportCsv', err, { outputPath })
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('excelTool:exportXlsx', async (_, sheets: unknown, rawOutput: unknown) => {
    const outputResult = FilePathSchema.safeParse(rawOutput)
    if (!outputResult.success || typeof sheets !== 'object' || sheets === null) {
      return { success: false, error: '유효하지 않은 입력' }
    }
    const outputPath = outputResult.data
    try {
      const wb = XLSX.utils.book_new()
      for (const [name, data] of Object.entries(sheets as Record<string, unknown[][]>)) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), name)
      }
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      XLSX.writeFile(wb, outputPath)
      log.info(`[excelTool:exportXlsx] → ${outputPath}`)
      return { success: true }
    } catch (err) {
      logIpcError('excelTool:exportXlsx', err, { outputPath })
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
