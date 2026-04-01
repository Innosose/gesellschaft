import { ipcMain, app } from 'electron'
import { join } from 'path'
import { z } from 'zod'
import log from './logger'
import { readJsonSync, writeJsonLocked } from './jsonStore'
import type { PomodoroStats, PomodoroSession } from '../shared/types'

// ── Zod 스키마 ─────────────────────────────────────────────────────────────

const SessionSaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completedPomodoros: z.number().int().min(0).max(100),
  totalFocusMinutes: z.number().int().min(0).max(1440),
})

// ── 스토리지 ───────────────────────────────────────────────────────────────

function getPath(): string {
  return join(app.getPath('userData'), 'pomodoro-stats.json')
}

function loadStats(): PomodoroStats {
  return readJsonSync<PomodoroStats>(getPath(), { sessions: [] })
}

async function saveStats(stats: PomodoroStats): Promise<void> {
  await writeJsonLocked(getPath(), stats)
}

// ── IPC 핸들러 ─────────────────────────────────────────────────────────────

export function registerPomodoroHandlers(): void {
  /** 전체 통계 조회 */
  ipcMain.handle('pomodoro:getStats', () => loadStats())

  /** 세션 완료 기록 — 당일 row를 upsert */
  ipcMain.handle('pomodoro:saveSession', async (_, raw: unknown) => {
    const result = SessionSaveSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[pomodoro:saveSession] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 세션 데이터' }
    }
    const { date, completedPomodoros, totalFocusMinutes } = result.data
    const stats = loadStats()
    const idx = stats.sessions.findIndex((s: PomodoroSession) => s.date === date)
    if (idx >= 0) {
      stats.sessions[idx].completedPomodoros += completedPomodoros
      stats.sessions[idx].totalFocusMinutes  += totalFocusMinutes
    } else {
      stats.sessions.push({ date, completedPomodoros, totalFocusMinutes })
      // 최근 90일만 보관
      stats.sessions.sort((a, b) => b.date.localeCompare(a.date))
      stats.sessions = stats.sessions.slice(0, 90)
    }
    await saveStats(stats)
    log.debug(`[pomodoro] 세션 저장: ${date} +${completedPomodoros}개 +${totalFocusMinutes}분`)
    return { success: true }
  })

  /** 전체 통계 초기화 */
  ipcMain.handle('pomodoro:clearStats', async () => {
    await saveStats({ sessions: [] })
    log.debug('[pomodoro] 통계 초기화')
    return { success: true }
  })
}
