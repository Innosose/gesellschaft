import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import ExcelJS from 'exceljs'
import { z } from 'zod'
import log, { logIpcError } from './logger'

const FilePathSchema = z.string().min(1)

const ExportSchema = z.object({
  filePath: z.string().min(1),
  sheet: z.string(),
  columns: z.array(z.string()),
  filterText: z.string().optional(),
  outputFormat: z.enum(['csv', 'xlsx']),
  outputPath: z.string().min(1),
})

function cellToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toLocaleDateString('ko-KR')
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>
    if ('result' in obj) return cellToString(obj.result as ExcelJS.CellValue)
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>).map(r => r.text ?? '').join('')
    }
    if ('text' in obj) return String(obj.text ?? '')
    if ('hyperlink' in obj && 'text' in obj) return String(obj.text ?? '')
  }
  return String(v)
}

async function readWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.csv') {
    await workbook.csv.readFile(filePath)
  } else {
    await workbook.xlsx.readFile(filePath)
  }
  return workbook
}

function worksheetToRows(ws: ExcelJS.Worksheet): string[][] {
  const rows: string[][] = []
  ws.eachRow((row) => {
    const values = row.values as ExcelJS.CellValue[]
    // row.values is 1-indexed; index 0 is empty
    rows.push(values.slice(1).map(cellToString))
  })
  return rows
}

export function registerExcelToolHandlers(): void {
  ipcMain.handle('excelTool:openFiles', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'Spreadsheet', extensions: ['xlsx', 'csv'] }],
      properties: ['openFile'],
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('excelTool:loadFile', async (_, rawPath: unknown) => {
    const parsed = FilePathSchema.safeParse(rawPath)
    if (!parsed.success) return { success: false, error: '유효하지 않은 파일 경로' }
    const filePath = parsed.data
    try {
      const workbook = await readWorkbook(filePath)
      const sheetNames = workbook.worksheets.map(ws => ws.name)
      const data: Record<string, string[][]> = {}
      for (const ws of workbook.worksheets) {
        data[ws.name] = worksheetToRows(ws)
      }
      const ext = path.extname(filePath)
      const defaultOutputPath = path.join(app.getPath('desktop'), path.basename(filePath, ext) + '_output')
      log.debug(`[excelTool:loadFile] ${sheetNames.length}개 시트: ${path.basename(filePath)}`)
      return { success: true, sheets: sheetNames, data, defaultOutputPath }
    } catch (err) {
      logIpcError('excelTool:loadFile', err, { filePath })
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('excelTool:loadSheet', async (_, rawPath: unknown, rawSheet: unknown) => {
    const pathParsed = FilePathSchema.safeParse(rawPath)
    const sheetParsed = z.string().safeParse(rawSheet)
    if (!pathParsed.success || !sheetParsed.success) return []
    const filePath = pathParsed.data
    const sheetName = sheetParsed.data
    try {
      const workbook = await readWorkbook(filePath)
      const ws = workbook.getWorksheet(sheetName)
      if (!ws) return []
      return worksheetToRows(ws)
    } catch (err) {
      logIpcError('excelTool:loadSheet', err, { filePath, sheetName })
      return []
    }
  })

  ipcMain.handle('excelTool:openOutputPath', async (event, rawFormat: unknown) => {
    const formatParsed = z.enum(['csv', 'xlsx']).safeParse(rawFormat)
    const format = formatParsed.success ? formatParsed.data : 'csv'
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: path.join(app.getPath('desktop'), `output.${format}`),
      filters: format === 'csv'
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'Excel', extensions: ['xlsx'] }],
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('excelTool:export', async (_, raw: unknown) => {
    const parsed = ExportSchema.safeParse(raw)
    if (!parsed.success) {
      log.warn('[excelTool:export] 유효하지 않은 입력', parsed.error.flatten())
      return { success: false, error: '유효하지 않은 입력' }
    }
    const { filePath, sheet, columns, filterText, outputFormat, outputPath } = parsed.data
    try {
      const workbook = await readWorkbook(filePath)
      const ws = workbook.getWorksheet(sheet) ?? workbook.worksheets[0]
      if (!ws) return { success: false, error: '시트를 찾을 수 없습니다' }

      const rows = worksheetToRows(ws)
      if (rows.length === 0) return { success: false, error: '데이터가 없습니다' }

      const header = rows[0]
      const colIndices = columns.length > 0
        ? columns.map(c => header.indexOf(c)).filter(i => i >= 0)
        : header.map((_, i) => i)

      const dataRows = rows.slice(1).filter(row =>
        !filterText || row.some(cell => cell.toLowerCase().includes(filterText.toLowerCase()))
      )

      const outRows = [
        colIndices.map(i => header[i] ?? ''),
        ...dataRows.map(row => colIndices.map(i => row[i] ?? '')),
      ]

      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const outWb = new ExcelJS.Workbook()
      const outWs = outWb.addWorksheet('Sheet1')
      outRows.forEach(row => outWs.addRow(row))

      if (outputFormat === 'csv') {
        const csvPath = outputPath.endsWith('.csv') ? outputPath : outputPath + '.csv'
        // Write as buffer then prepend BOM for Korean Excel compatibility
        const buffer = await outWb.csv.writeBuffer()
        fs.writeFileSync(csvPath, Buffer.concat([Buffer.from('\uFEFF', 'utf8'), buffer as Buffer]))
        log.info(`[excelTool:export] CSV → ${csvPath}`)
      } else {
        const xlsxPath = outputPath.endsWith('.xlsx') ? outputPath : outputPath + '.xlsx'
        await outWb.xlsx.writeFile(xlsxPath)
        log.info(`[excelTool:export] XLSX → ${xlsxPath}`)
      }

      return { success: true }
    } catch (err) {
      logIpcError('excelTool:export', err, { filePath, outputPath })
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
