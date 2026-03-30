import { ipcMain, desktopCapturer } from 'electron'
import log, { logIpcError } from './logger'
import { TOOL_DESCRIPTIONS } from '../shared/constants'
import { load as loadConfig } from './aiAssistant'

const VALID_IDS = new Set(Object.keys(TOOL_DESCRIPTIONS))
const API_TIMEOUT_MS = 30_000

function parseRecommendations(text: string): string[] {
  try {
    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is string => typeof x === 'string')
      .filter(id => VALID_IDS.has(id))
      .slice(0, 3)
  } catch {
    return []
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

export function registerScreenCaptureHandlers(): void {
  ipcMain.handle('screen:captureAndAnalyze', async () => {
    log.debug('[screen:captureAndAnalyze] 캡처 시작')
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
      })
      if (!sources.length) return { success: false, error: '화면을 찾을 수 없습니다.', recommendations: [] }

      const screenshot = sources[0].thumbnail.toDataURL()
      if (!screenshot || screenshot === 'data:,') {
        return { success: false, error: '화면 캡처에 실패했습니다.', recommendations: [] }
      }

      const cfg = loadConfig()

      if (cfg.provider === 'ollama') {
        return { success: false, error: '화면 분석은 OpenAI 또는 Anthropic 프로바이더에서만 지원됩니다.', recommendations: [] }
      }
      if (!cfg.apiKey) {
        return { success: false, error: 'API 키를 먼저 설정해주세요.', recommendations: [] }
      }

      const toolList = Object.entries(TOOL_DESCRIPTIONS)
        .map(([id, desc]) => `- ${id}: ${desc}`)
        .join('\n')

      const prompt = `당신은 PC 화면을 분석해서 유용한 도구를 추천하는 어시스턴트입니다.
현재 화면을 보고, 아래 도구 목록 중 지금 상황에서 가장 유용할 것 같은 도구 ID를 최대 3개만 골라주세요.

도구 목록:
${toolList}

응답 형식: JSON 배열만 출력 (예: ["pdfTool", "imageConvert", "search"])
설명 없이 JSON 배열만 출력하세요.`

      let recommendations: string[] = []

      if (cfg.provider === 'openai') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const OpenAI = require('openai').default
        const client = new OpenAI({ apiKey: cfg.apiKey })
        const response = await withTimeout(
          client.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: screenshot } },
                { type: 'text', text: prompt },
              ],
            }],
            max_tokens: 120,
          }),
          API_TIMEOUT_MS
        )
        const text = response.choices[0]?.message?.content ?? ''
        recommendations = parseRecommendations(text)

      } else if (cfg.provider === 'anthropic') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Anthropic = require('@anthropic-ai/sdk').default
        const client = new Anthropic({ apiKey: cfg.apiKey })

        // data URL 헤더에서 실제 MIME 타입 추출 (e.g. "data:image/png;base64,...")
        const headerMatch = screenshot.match(/^data:([^;]+);base64,/)
        const mediaType = (headerMatch?.[1] ?? 'image/png') as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
        const base64 = screenshot.split(',')[1]
        if (!base64) {
          return { success: false, error: '스크린샷 인코딩에 실패했습니다.', recommendations: [] }
        }

        const response = await withTimeout(
          client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 120,
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
        const text = (response.content[0] as { text?: string }).text ?? ''
        recommendations = parseRecommendations(text)
      }

      log.info(`[screen:captureAndAnalyze] 추천: ${JSON.stringify(recommendations)}`)
      return { success: true, recommendations }
    } catch (e) {
      logIpcError('screen:captureAndAnalyze', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : '알 수 없는 오류',
        recommendations: [],
      }
    }
  })
}
