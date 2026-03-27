import { ipcMain, app, BrowserWindow, safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

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

function load(): AiConfig {
  try {
    const raw: AiConfig & { _enc?: boolean } = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8')) }
    // Decrypt API key if encrypted with safeStorage
    if (raw._enc && raw.apiKey && safeStorage.isEncryptionAvailable()) {
      try { raw.apiKey = safeStorage.decryptString(Buffer.from(raw.apiKey, 'base64')) } catch { raw.apiKey = '' }
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

export function registerAiAssistantHandlers(): void {
  // 설정 조회 (apiKey는 마스킹)
  ipcMain.handle('ai:getConfig', () => {
    const cfg = load()
    return { ...cfg, apiKey: cfg.apiKey ? '••••' + cfg.apiKey.slice(-4) : '' }
  })

  // 설정 저장
  ipcMain.handle('ai:setConfig', (_, patch: Partial<AiConfig> & { apiKeyRaw?: string }) => {
    const cfg = load()
    const next = { ...cfg, ...patch }
    if (patch.apiKeyRaw !== undefined) next.apiKey = patch.apiKeyRaw
    delete (next as Record<string, unknown>).apiKeyRaw
    save(next)
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

  // 채팅 (스트리밍)
  ipcMain.handle('ai:chat', async (event, messages: ChatMessage[]) => {
    const cfg = load()

    if (!cfg.apiKey && cfg.provider !== 'ollama') {
      event.sender.send('ai:error', 'API 키를 먼저 설정해주세요.')
      return
    }

    abort = new AbortController()
    const { signal } = abort

    const withSystem = cfg.systemPrompt
      ? [{ role: 'system' as const, content: cfg.systemPrompt }, ...messages]
      : messages

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
          if (text) event.sender.send('ai:chunk', text)
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
            event.sender.send('ai:chunk', ev.delta.text)
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
              if (data.message?.content) event.sender.send('ai:chunk', data.message.content)
            } catch { /* skip */ }
          }
        }
      }

      event.sender.send('ai:done')
    } catch (e: unknown) {
      if (!signal.aborted) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        event.sender.send('ai:error', msg)
      }
    } finally {
      abort = null
    }
  })

  // 생성 취소
  ipcMain.handle('ai:cancel', () => {
    abort?.abort()
    abort = null
  })
}
