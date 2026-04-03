import { ipcMain, desktopCapturer, BrowserWindow } from 'electron'
import log, { logIpcError } from './logger'
import { TOOL_DESCRIPTIONS } from '../shared/constants'
import { load as loadConfig } from './aiAssistant'

const VALID_IDS     = new Set(Object.keys(TOOL_DESCRIPTIONS))
const API_TIMEOUT_MS = 30_000
const HIDE_DELAY_MS  = 500    // wait for window to disappear before screenshot (increased for slow machines)

interface RawItem { id: string; reason?: string }

function parseRecommendations(text: string): { ids: string[]; reasons: Record<string, string> } {
  try {
    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return { ids: [], reasons: {} }
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return { ids: [], reasons: {} }

    const ids: string[] = []
    const reasons: Record<string, string> = {}

    for (const item of parsed) {
      // Support both string array ["id"] and object array [{"id":"..","reason":".."}]
      const id     = typeof item === 'string' ? item : (item as RawItem).id
      const reason = typeof item === 'object' && item !== null ? (item as RawItem).reason ?? '' : ''
      if (typeof id === 'string' && VALID_IDS.has(id)) {
        ids.push(id)
        if (reason) reasons[id] = reason
      }
      if (ids.length >= 3) break
    }

    return { ids, reasons }
  } catch {
    return { ids: [], reasons: {} }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`API 응답 시간 초과 (${ms / 1000}초)`)), ms)
    ),
  ])
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function registerScreenCaptureHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('screen:captureAndAnalyze', async () => {
    log.debug('[screen:captureAndAnalyze] 캡처 시작')

    // Hide the overlay so the screenshot shows the real desktop
    const wasVisible = mainWindow.isVisible()
    if (wasVisible) {
      mainWindow.hide()
      await sleep(HIDE_DELAY_MS)
    }

    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      })

      if (wasVisible) mainWindow.show()

      if (!sources.length) return { success: false, error: '화면을 찾을 수 없습니다.', recommendations: [], reasons: {} }

      const source = sources[0]
      if (!source?.thumbnail) return { success: false, error: 'No source found', recommendations: [], reasons: {} }

      const screenshot = source.thumbnail.toDataURL()
      if (!screenshot || screenshot === 'data:,') {
        return { success: false, error: '화면 캡처에 실패했습니다.', recommendations: [], reasons: {} }
      }

      const cfg = loadConfig()

      if (cfg.provider === 'ollama') {
        return { success: false, error: '화면 분석은 OpenAI 또는 Anthropic 프로바이더에서만 지원됩니다.', recommendations: [], reasons: {} }
      }
      if (!cfg.apiKey) {
        return { success: false, error: 'API 키를 먼저 설정해주세요.', recommendations: [], reasons: {} }
      }

      const toolList = Object.entries(TOOL_DESCRIPTIONS)
        .map(([id, desc]) => `  "${id}": "${desc}"`)
        .join('\n')

      const prompt = `사용자의 PC 화면을 분석하여 지금 바로 쓸 수 있는 도구를 추천합니다.

화면에 보이는 것들을 정확히 파악하세요:
- 열린 앱, 브라우저 탭, 파일 탐색기, 문서 등
- 작업 중인 내용의 종류 (코딩, 문서 작성, 웹 검색, 디자인 등)
- 파일 확장자, 텍스트 내용, UI 요소

사용 가능한 도구:
${toolList}

추천 규칙:
1. 화면에 직접 관련된 도구만 추천 (최대 3개)
2. 가장 유용한 순서대로 정렬
3. 화면과 무관한 도구는 절대 추천하지 마세요
4. 확실하지 않으면 빈 배열 반환

JSON 배열만 반환:
[{"id": "toolId", "reason": "추천 이유 (15자 이내)"}]`

      let ids: string[] = []
      let reasons: Record<string, string> = {}

      if (cfg.provider === 'openai') {
         
        const OpenAI = require('openai').default
        const client = new OpenAI({ apiKey: cfg.apiKey })
        const response = await withTimeout(
          client.chat.completions.create({
            model: cfg.model || 'gpt-4o',
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: screenshot, detail: 'high' } },
                { type: 'text', text: prompt },
              ],
            }],
            max_tokens: 200,
            response_format: { type: 'json_object' },
          }),
          API_TIMEOUT_MS
        )
        const text = (response as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? ''
        // response_format:json_object wraps in object — unwrap if needed
        const inner = text.match(/\[[\s\S]*?\]/)
        const result = parseRecommendations(inner ? text : `[${text}]`)
        ids = result.ids; reasons = result.reasons

      } else if (cfg.provider === 'anthropic') {
         
        const Anthropic = require('@anthropic-ai/sdk').default
        const client = new Anthropic({ apiKey: cfg.apiKey })

        const headerMatch = screenshot.match(/^data:([^;]+);base64,/)
        const mediaType = (headerMatch?.[1] ?? 'image/png') as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
        const base64 = screenshot.split(',')[1]
        if (!base64) {
          return { success: false, error: '스크린샷 인코딩에 실패했습니다.', recommendations: [], reasons: {} }
        }

        const response = await withTimeout(
          client.messages.create({
            model: cfg.model || 'claude-sonnet-4-6',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: prompt },
              ],
            }],
          }),
          API_TIMEOUT_MS
        )
        const text = ((response as { content: { text?: string }[] }).content[0])?.text ?? ''
        const result = parseRecommendations(text)
        ids = result.ids; reasons = result.reasons
      }

      log.info(`[screen:captureAndAnalyze] 추천: ${JSON.stringify(ids)}, 이유: ${JSON.stringify(reasons)}`)
      return { success: true, recommendations: ids, reasons }

    } catch (e) {
      if (wasVisible) mainWindow.show()
      logIpcError('screen:captureAndAnalyze', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : '알 수 없는 오류',
        recommendations: [],
        reasons: {},
      }
    }
  })
}
