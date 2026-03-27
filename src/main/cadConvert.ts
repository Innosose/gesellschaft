import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import { join, dirname, basename, extname } from 'path'
import fs from 'fs'

export interface ConvertResult {
  inputPath: string
  outputPath?: string
  success: boolean
  error?: string
}

// DXF → SVG string
async function dxfToSvg(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf-8')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Helper } = require('dxf') as { Helper: new (content: string) => { toSVG: () => string } }
  const helper = new Helper(content)
  return helper.toSVG()
}

// SVG → PDF via hidden BrowserWindow + printToPDF
async function svgToPdf(svgContent: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    const html = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: white; }
  .wrap { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; padding: 8mm; }
  svg { max-width: 100%; max-height: 100%; object-fit: contain; }
</style></head>
<body><div class="wrap">${svgContent}</div></body></html>`

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    win.webContents.once('did-finish-load', async () => {
      try {
        const pdfBuffer = await win.webContents.printToPDF({
          landscape: true,
          pageSize: 'A4',
          printBackground: true,
          margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
        })
        fs.writeFileSync(outputPath, pdfBuffer)
        win.close()
        resolve()
      } catch (e) {
        win.close()
        reject(e)
      }
    })

    win.webContents.once('did-fail-load', (_, code, desc) => {
      win.close()
      reject(new Error(`페이지 로드 실패: ${desc} (${code})`))
    })
  })
}

export function registerCadConvertHandlers(): void {
  // 파일 다중 선택 다이얼로그
  ipcMain.handle('cadConvert:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      title: 'CAD 파일 선택',
      filters: [
        { name: 'CAD 파일', extensions: ['dxf', 'dwg'] },
        { name: '모든 파일', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    return result.canceled ? [] : result.filePaths
  })

  // 출력 폴더 선택
  ipcMain.handle('cadConvert:openOutputDir', async () => {
    const result = await dialog.showOpenDialog({
      title: '저장 폴더 선택',
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 변환 실행 (파일 하나씩 변환 후 진행 상황 전송)
  ipcMain.handle(
    'cadConvert:convert',
    async (
      event,
      files: string[],
      outputDir: string
    ): Promise<ConvertResult[]> => {
      const results: ConvertResult[] = []

      for (const filePath of files) {
        const ext = extname(filePath).toLowerCase()
        const nameWithoutExt = basename(filePath, ext)
        const outDir = outputDir || dirname(filePath)
        const outputPath = join(outDir, `${nameWithoutExt}.pdf`)

        // 진행 상황 전송
        event.sender.send('cadConvert:progress', { filePath, status: 'converting' })

        if (ext === '.dwg') {
          results.push({
            inputPath: filePath,
            success: false,
            error: 'DWG는 직접 변환 불가 — AutoCAD에서 DXF로 내보낸 후 변환하세요'
          })
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
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          results.push({ inputPath: filePath, success: false, error: msg })
          event.sender.send('cadConvert:progress', { filePath, status: 'error', error: msg })
        }
      }

      return results
    }
  )

  // 완성된 PDF 열기
  ipcMain.handle('cadConvert:openPdf', async (_, pdfPath: string) => {
    const { shell } = await import('electron')
    await shell.openPath(pdfPath)
  })

  // 기본 출력 폴더 (다운로드)
  ipcMain.handle('cadConvert:defaultOutputDir', () => {
    return app.getPath('downloads')
  })
}
