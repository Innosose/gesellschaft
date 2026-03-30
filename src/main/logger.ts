import log from 'electron-log'
import { app } from 'electron'
import * as path from 'path'

// 로그 파일 위치: userData/logs/main.log
log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('userData'), 'logs', 'main.log')

// 파일 로그 레벨: 개발=debug, 프로덕션=info
log.transports.file.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

// 콘솔 로그: 개발 모드에서만 출력
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : false

// 최대 파일 크기 5MB, 이전 로그 1개 보관
log.transports.file.maxSize = 5 * 1024 * 1024

export default log

/** IPC 핸들러 에러를 구조화된 형태로 기록 */
export function logIpcError(channel: string, err: unknown, context?: Record<string, unknown>): void {
  const msg = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  log.error(`[IPC:${channel}] ${msg}`, { ...context, stack })
}
