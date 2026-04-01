import { useState, useCallback, useRef, useEffect } from 'react'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface AppNotification {
  id: number
  message: string
  type: NotificationType
}

let notifIdCounter = 0

/**
 * useNotification()
 *
 * 앱 내 알림 추가/자동 제거/수동 닫기를 캡슐화.
 *
 * @example
 * const { notifications, notify, dismiss } = useNotification()
 * notify('저장됐습니다', 'success')
 */
export function useNotification(autoDismissMs = 4000) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  // Cleanup on unmount
  useEffect(() => {
    return () => { timers.current.forEach(t => clearTimeout(t)) }
  }, [])

  const notify = useCallback(
    (message: string, type: NotificationType = 'info') => {
      const id = ++notifIdCounter
      setNotifications(prev => [...prev, { id, message, type }])
      const timer = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
        timers.current.delete(id)
      }, autoDismissMs)
      timers.current.set(id, timer)
      return id
    },
    [autoDismissMs],
  )

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    timers.current.forEach(t => clearTimeout(t))
    timers.current.clear()
    setNotifications([])
  }, [])

  return { notifications, notify, dismiss, dismissAll }
}
