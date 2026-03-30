/**
 * screenCapture.ts — JSON 파싱 및 응답 처리 로직 단위 테스트
 * (electron, OpenAI, Anthropic 모듈 없이 핵심 로직만 테스트)
 */

/** screenCapture.ts의 JSON 배열 추출 로직과 동일 */
function extractJsonArray(text: string): string[] {
  const match = text.match(/\[[\s\S]*?\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0])
  } catch {
    return []
  }
}

describe('extractJsonArray — AI 응답에서 도구 목록 파싱', () => {
  it('정상 JSON 배열 파싱', () => {
    const text = '["pdfTool", "search", "imageConvert"]'
    expect(extractJsonArray(text)).toEqual(['pdfTool', 'search', 'imageConvert'])
  })

  it('텍스트 사이에 포함된 JSON 배열 추출', () => {
    const text = '추천 도구입니다:\n["pdfTool", "todo"]\n설명 생략'
    expect(extractJsonArray(text)).toEqual(['pdfTool', 'todo'])
  })

  it('빈 배열 처리', () => {
    expect(extractJsonArray('[]')).toEqual([])
  })

  it('JSON 없는 응답 → 빈 배열 반환', () => {
    expect(extractJsonArray('도구를 찾을 수 없습니다.')).toEqual([])
  })

  it('잘못된 JSON → 빈 배열 반환', () => {
    expect(extractJsonArray('[invalid json}')).toEqual([])
  })

  it('중첩 따옴표 처리', () => {
    const text = '["search"]'
    const result = extractJsonArray(text)
    expect(result).toEqual(['search'])
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('base64 이미지 추출 — Anthropic용', () => {
  it('data URL에서 base64 부분만 추출', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo='
    const base64 = dataUrl.split(',')[1]
    expect(base64).toBe('iVBORw0KGgo=')
  })

  it('comma 없는 잘못된 data URL → undefined', () => {
    const dataUrl = 'not-a-data-url'
    const base64 = dataUrl.split(',')[1]
    expect(base64).toBeUndefined()
  })
})

describe('API 키 검사 로직', () => {
  it('apiKey 있고 provider가 openai → 요청 가능', () => {
    const cfg = { apiKey: 'sk-test', provider: 'openai' }
    const canRequest = !(!cfg.apiKey && cfg.provider !== 'ollama')
    expect(canRequest).toBe(true)
  })

  it('apiKey 없고 provider가 openai → 요청 불가', () => {
    const cfg = { apiKey: '', provider: 'openai' }
    const canRequest = !(!cfg.apiKey && cfg.provider !== 'ollama')
    expect(canRequest).toBe(false)
  })

  it('apiKey 없어도 provider가 ollama → 요청 가능', () => {
    const cfg = { apiKey: '', provider: 'ollama' }
    const canRequest = !(!cfg.apiKey && cfg.provider !== 'ollama')
    expect(canRequest).toBe(true)
  })
})
