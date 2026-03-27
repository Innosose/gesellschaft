import { ipcMain, desktopCapturer, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const CONFIG_PATH = (): string => path.join(app.getPath('userData'), 'ai-config.json')

interface AiConfig {
  provider: string
  apiKey: string
  model: string
  ollamaUrl: string
}

const DEFAULTS: AiConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  ollamaUrl: 'http://localhost:11434',
}

function loadConfig(): AiConfig {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  search:        '파일 검색 및 탐색',
  cadConvert:    'DWG/DXF CAD 파일을 PDF로 변환',
  pdfTool:       'PDF 병합, 분할, 편집',
  imageConvert:  '이미지 포맷 변환, 리사이징',
  excelTool:     'Excel/CSV 파일 열기, 변환, 내보내기',
  bulkRename:    '여러 파일을 한번에 이름 변경',
  folderCompare: '두 폴더의 차이점 비교',
  todo:          '할일 목록 관리',
  reminder:      '파일 관련 업무 리마인더',
  notes:         '빠른 메모 작성',
  snippets:      '자주 쓰는 코드나 텍스트 스니펫 관리',
  emailTemplate: '이메일 템플릿 저장 및 불러오기',
  clipboard:     '클립보드 복사 기록',
  vatCalc:       '부가세 계산',
  dateCalc:      '날짜 차이, D-Day 계산',
  exchangeRate:  '환율 계산 및 변환',
  unitConverter: '길이, 무게, 온도 등 단위 변환',
  korEng:        '한영 오타 자동 변환',
  textTools:     '텍스트 대소문자, 공백, 줄바꿈 정리',
  qrCode:        'QR 코드 생성',
  colorPicker:   '색상 코드 추출 및 변환',
  ocr:           '이미지에서 텍스트 추출',
}

export function registerScreenCaptureHandlers(): void {
  ipcMain.handle('screen:captureAndAnalyze', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
      })
      if (!sources.length) return { success: false, error: '화면을 찾을 수 없습니다.', recommendations: [] }

      const screenshot = sources[0].thumbnail.toDataURL()
      const cfg = loadConfig()

      if (!cfg.apiKey && cfg.provider !== 'ollama') {
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
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: screenshot } },
              { type: 'text', text: prompt },
            ],
          }],
          max_tokens: 120,
        })
        const text = response.choices[0]?.message?.content || '[]'
        const match = text.match(/\[[\s\S]*?\]/)
        recommendations = match ? JSON.parse(match[0]) : []

      } else if (cfg.provider === 'anthropic') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Anthropic = require('@anthropic-ai/sdk').default
        const client = new Anthropic({ apiKey: cfg.apiKey })
        const base64 = screenshot.split(',')[1]
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 120,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
              { type: 'text', text: prompt },
            ],
          }],
        })
        const text = (response.content[0] as { text: string }).text || '[]'
        const match = text.match(/\[[\s\S]*?\]/)
        recommendations = match ? JSON.parse(match[0]) : []
      }

      return { success: true, recommendations }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : '알 수 없는 오류',
        recommendations: [],
      }
    }
  })
}
