import { ipcMain, app, safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'
import log, { logIpcError } from './logger'

export interface AiConfig {
  provider: 'openai' | 'anthropic' | 'ollama'
  apiKey: string
  model: string
  systemPrompt: string
  ollamaUrl: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const CONFIG_PATH = () => path.join(app.getPath('userData'), 'ai-config.json')

const DEFAULTS: AiConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPrompt: '당신은 업무를 도와주는 AI 어시스턴트입니다. 한국어로 간결하게 답변해주세요.',
  ollamaUrl: 'http://localhost:11434',
}

const PRESET_MODELS: Record<string, string[]> = {
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  ollama:    [],
}

// Zod 스키마
const ChatMessageSchema = z.object({
  role:    z.enum(['user', 'assistant']),
  content: z.string().min(1).max(32_000),
})
const ChatMessagesSchema = z.array(ChatMessageSchema).min(1).max(200)

const AiConfigPatchSchema = z.object({
  provider:     z.enum(['openai', 'anthropic', 'ollama']).optional(),
  model:        z.string().max(100).optional(),
  systemPrompt: z.string().max(4000).optional(),
  ollamaUrl:    z.string().url().optional(),
  apiKeyRaw:    z.string().max(200).optional(),
})

function load(): AiConfig {
  try {
    const raw: AiConfig & { _enc?: boolean } = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8')) }
    if (raw._enc && raw.apiKey && safeStorage.isEncryptionAvailable()) {
      try { raw.apiKey = safeStorage.decryptString(Buffer.from(raw.apiKey, 'base64')) } catch (e) { raw.apiKey = ''; log.warn('[ai:load] API 키 복호화 실패 — 키가 초기화됩니다', e) }
    }
    delete raw._enc
    return raw
  } catch {
    return { ...DEFAULTS }
  }
}

function save(cfg: AiConfig): void {
  const toStore: AiConfig & { _enc?: boolean } = { ...cfg }
  if (cfg.apiKey && safeStorage.isEncryptionAvailable()) {
    toStore.apiKey = safeStorage.encryptString(cfg.apiKey).toString('base64')
    toStore._enc = true
  }
  fs.writeFileSync(CONFIG_PATH(), JSON.stringify(toStore, null, 2), 'utf8')
}

let abort: AbortController | null = null

/**
 * 스트리밍 청크를 배치로 묶어 렌더러에 전송 — 과도한 IPC 호출 방지
 * 최대 BATCH_INTERVAL ms 마다 또는 BATCH_SIZE 이상 쌓이면 flush
 */
function createChunkBatcher(sender: Electron.WebContents, signal: AbortSignal) {
  const BATCH_INTERVAL = 30  // ms
  const BATCH_SIZE = 200     // chars

  let buffer = ''
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (timer) { clearTimeout(timer); timer = null }
    if (buffer && !sender.isDestroyed() && !signal.aborted) {
      sender.send('ai:chunk', buffer)
      buffer = ''
    }
  }

  function push(text: string) {
    if (signal.aborted) return
    buffer += text
    if (buffer.length >= BATCH_SIZE) {
      flush()
    } else if (!timer) {
      timer = setTimeout(flush, BATCH_INTERVAL)
    }
  }

  return { push, flush }
}

export function registerAiAssistantHandlers(): void {
  // 설정 조회 (apiKey는 마스킹)
  ipcMain.handle('ai:getConfig', () => {
    const cfg = load()
    return { ...cfg, apiKey: cfg.apiKey ? '••••' + cfg.apiKey.slice(-4) : '' }
  })

  // 설정 저장
  ipcMain.handle('ai:setConfig', (_, patch: unknown) => {
    const result = AiConfigPatchSchema.safeParse(patch)
    if (!result.success) {
      log.warn('[ai:setConfig] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 설정값' }
    }
    const cfg = load()
    const next = { ...cfg, ...result.data }
    if (result.data.apiKeyRaw !== undefined) next.apiKey = result.data.apiKeyRaw
    delete (next as Record<string, unknown>).apiKeyRaw
    save(next)
    log.info(`[ai:setConfig] provider=${next.provider} model=${next.model}`)
    return { success: true }
  })

  // 설치된 Ollama 모델 목록
  ipcMain.handle('ai:getOllamaModels', async () => {
    const { ollamaUrl } = load()
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`)
      const data = await res.json() as { models: { name: string }[] }
      return data.models.map(m => m.name)
    } catch {
      return []
    }
  })

  // 모델 프리셋
  ipcMain.handle('ai:getPresetModels', () => PRESET_MODELS)

  // 채팅 (스트리밍 + 청크 배칭)
  ipcMain.handle('ai:chat', async (event, rawMessages: unknown) => {
    const parsed = ChatMessagesSchema.safeParse(rawMessages)
    if (!parsed.success) {
      event.sender.send('ai:error', '유효하지 않은 메시지 형식')
      log.warn('[ai:chat] 유효하지 않은 메시지', parsed.error.flatten())
      return
    }

    const messages = parsed.data
    const cfg = load()

    if (!cfg.apiKey && cfg.provider !== 'ollama') {
      event.sender.send('ai:error', 'API 키를 먼저 설정해주세요.')
      return
    }

    abort = new AbortController()
    const { signal } = abort
    const batcher = createChunkBatcher(event.sender, signal)

    const TIMEOUT_MS = 60_000
    const timeoutId = setTimeout(() => {
      if (abort) {
        abort.abort()
        if (!event.sender.isDestroyed()) event.sender.send('ai:error', 'AI 응답 시간이 초과되었습니다 (60초).')
        log.warn('[ai:chat] 타임아웃으로 스트림 종료')
      }
    }, TIMEOUT_MS)

    const withSystem = cfg.systemPrompt
      ? [{ role: 'system' as const, content: cfg.systemPrompt }, ...messages]
      : messages

    log.info(`[ai:chat] provider=${cfg.provider} model=${cfg.model} messages=${messages.length}`)

    try {
      if (cfg.provider === 'openai') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const OpenAI = require('openai').default
        const client = new OpenAI({ apiKey: cfg.apiKey })
        const stream = await client.chat.completions.create({
          model: cfg.model || 'gpt-4o-mini',
          messages: withSystem,
          stream: true,
        })
        for await (const chunk of stream) {
          if (signal.aborted) break
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) batcher.push(text)
        }

      } else if (cfg.provider === 'anthropic') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Anthropic = require('@anthropic-ai/sdk').default
        const client = new Anthropic({ apiKey: cfg.apiKey })
        const system = withSystem.find(m => m.role === 'system')?.content
        const userMessages = messages.map(m => ({ role: m.role, content: m.content }))
        const stream = client.messages.stream({
          model: cfg.model || 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          ...(system ? { system } : {}),
          messages: userMessages,
        })
        for await (const ev of stream) {
          if (signal.aborted) break
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            batcher.push(ev.delta.text)
          }
        }

      } else {
        // Ollama
        const res = await fetch(`${cfg.ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: cfg.model, messages: withSystem, stream: true }),
          signal,
        })
        if (!res.ok || !res.body) throw new Error(`Ollama: ${res.statusText}`)
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done || signal.aborted) break
          for (const line of dec.decode(value).split('\n').filter(Boolean)) {
            try {
              const data = JSON.parse(line)
              if (data.message?.content) batcher.push(data.message.content)
            } catch { /* skip malformed line */ }
          }
        }
      }

      batcher.flush()
      if (!event.sender.isDestroyed()) event.sender.send('ai:done')
      log.info('[ai:chat] 완료')

    } catch (e: unknown) {
      batcher.flush()
      if (!signal.aborted) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        if (!event.sender.isDestroyed()) event.sender.send('ai:error', msg)
        logIpcError('ai:chat', e, { provider: cfg.provider })
      }
    } finally {
      clearTimeout(timeoutId)
      abort = null
    }
  })

  // 생성 취소
  ipcMain.handle('ai:cancel', () => {
    abort?.abort()
    abort = null
    log.debug('[ai:cancel] 취소됨')
  })
}

// 렌더러가 파괴될 때 진행 중인 스트림 정리
app.on('browser-window-created', (_, win) => {
  win.webContents.on('destroyed', () => {
    if (abort) {
      abort.abort()
      abort = null
      log.debug('[ai] 창 파괴로 스트림 정리')
    }
  })
})

