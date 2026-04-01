/** Minimal error logger — logs to console in dev, could be extended to file/remote */

const isDev = import.meta.env.DEV

export function logError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error)
  console.error(`[${context}] ${msg}`)
  if (isDev && error instanceof Error && error.stack) {
    console.error(error.stack)
  }
}

export function logWarn(context: string, message: string): void {
  console.warn(`[${context}] ${message}`)
}
