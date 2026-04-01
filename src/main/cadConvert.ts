import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import { join, dirname, basename, extname } from 'path'
import fs from 'fs'
import { z } from 'zod'
import log, { logIpcError } from './logger'

export interface ConvertResult {
  inputPath: string
  outputPath?: string
  success: boolean
  error?: string
}

const FilePathsSchema = z.array(z.string().min(1)).min(1).max(500)
const DirPathSchema   = z.string()

// DXF → SVG string
async function dxfToSvg(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf-8')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Helper } = require('dxf') as { Helper: new (content: string) => { toSVG: () => string } }
  const helper = new Helper(content)
  return helper.toSVG()
}

const PDF_TIMEOUT_MS = 30_000

// SVG → PDF via hidden BrowserWindow + printToPDF
async function svgToPdf(svgContent: string, outputPath: string): Promise<void> {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  const closeWin = (): void => {
    if (!win.isDestroyed()) win.close()
  }

  // timeoutId는 Promise 실행자 내에서 동기적으로 할당되므로
  // finally가 실행되는 시점에는 반드시 초기화되어 있음
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  // Sanitize SVG to prevent script injection
  const safeSvg = svgContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, 'data-removed=')

  const html = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: white; }
  .wrap { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; padding: 8mm; }
  svg { max-width: 100%; max-height: 100%; object-fit: contain; }
</style></head>
<body><div class="wrap">${safeSvg}</div></body></html>`

  const promise = new Promise<void>((resolve, reject) => {
    let settled = false
    const doSettle = (fn: () => void): void => {
      if (settled) return
      settled = true
      fn()
    }

    // loadURL 무응답·printToPDF 행(hang) 모두 포함하는 전체 작업 타임아웃
    timeoutId = setTimeout(() => {
      doSettle(() => reject(new Error(`PDF 변환 타임아웃 (${PDF_TIMEOUT_MS / 1000}초 초과)`)))
    }, PDF_TIMEOUT_MS)

    win.webContents.once('did-finish-load', async () => {
      try {
        const pdfBuffer = await win.webContents.printToPDF({
          landscape: true,
          pageSize: 'A4',
          printBackground: true,
          margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
        })
        fs.writeFileSync(outputPath, pdfBuffer)
        doSettle(() => resolve())
      } catch (e) {
        doSettle(() => reject(e))
      }
    })

    win.webContents.once('did-fail-load', (_, code, desc) => {
      doSettle(() => reject(new Error(`페이지 로드 실패: ${desc} (${code})`)))
    })

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  })

  // 성공·실패·타임아웃 어느 경로든 win 정리와 타임아웃 해제를 보장
  return promise.finally(() => {
    clearTimeout(timeoutId)
    closeWin()
  })
}

export function registerCadConvertHandlers(): void {
  ipcMain.handle('cadConvert:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      title: 'CAD 파일 선택',
      filters: [
        { name: 'CAD 파일', extensions: ['dxf', 'dwg'] },
        { name: '모든 파일', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('cadConvert:openOutputDir', async () => {
    const result = await dialog.showOpenDialog({
      title: '저장 폴더 선택',
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('cadConvert:convert', async (event, rawFiles: unknown, rawOutputDir: unknown) => {
    const filesResult  = FilePathsSchema.safeParse(rawFiles)
    const outputResult = DirPathSchema.safeParse(rawOutputDir)
    if (!filesResult.success) {
      log.warn('[cadConvert:convert] 유효하지 않은 파일 목록')
      return [{ inputPath: '', success: false, error: '유효하지 않은 파일 목록' }]
    }
    const files     = filesResult.data
    const outputDir = outputResult.success ? outputResult.data : ''
    const results: ConvertResult[] = []

    for (const filePath of files) {
      const ext           = extname(filePath).toLowerCase()
      const nameWithoutExt = basename(filePath, ext)
      const outDir        = outputDir || dirname(filePath)
      const outputPath    = join(outDir, `${nameWithoutExt}.pdf`)

      event.sender.send('cadConvert:progress', { filePath, status: 'converting' })

      if (ext === '.dwg') {
        results.push({ inputPath: filePath, success: false, error: 'DWG는 직접 변환 불가 — AutoCAD에서 DXF로 내보낸 후 변환하세요' })
        event.sender.send('cadConvert:progress', { filePath, status: 'error' })
        continue
      }

      if (ext !== '.dxf') {
        results.push({ inputPath: filePath, success: false, error: `지원하지 않는 형식: ${ext}` })
        event.sender.send('cadConvert:progress', { filePath, status: 'error' })
        continue
      }

      try {
        const svg = await dxfToSvg(filePath)
        await svgToPdf(svg, outputPath)
        results.push({ inputPath: filePath, outputPath, success: true })
        event.sender.send('cadConvert:progress', { filePath, status: 'done', outputPath })
        log.info(`[cadConvert] 변환 완료: ${basename(filePath)} → ${outputPath}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ inputPath: filePath, success: false, error: msg })
        event.sender.send('cadConvert:progress', { filePath, status: 'error', error: msg })
        logIpcError('cadConvert:convert', err, { filePath })
      }
    }

    return results
  })

  ipcMain.handle('cadConvert:openPdf', async (_, rawPath: unknown) => {
    if (typeof rawPath !== 'string' || !rawPath) return
    if (!fs.existsSync(rawPath)) return
    const { shell } = await import('electron')
    await shell.openPath(rawPath)
  })

  ipcMain.handle('cadConvert:defaultOutputDir', () => app.getPath('downloads'))
}
