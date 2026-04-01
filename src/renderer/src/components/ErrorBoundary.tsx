import React from 'react'
import { T, rgba } from '../utils/theme'
import { logError } from '../utils/logger'

const isDev = import.meta.env.DEV

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary — 하위 컴포넌트 크래시를 잡아 앱 전체 중단을 방지
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logError('ErrorBoundary', error)
    if (isDev) {
      console.error('[ErrorBoundary] componentStack:', info.componentStack)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 16,
            padding: 32,
            color: rgba(T.fg, 0.8),
            background: rgba(T.bg, 0.97),
          }}
        >
          <span style={{ fontSize: 32 }}>⚠</span>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
            이 기능을 불러오는 중 오류가 발생했습니다.
          </p>
          {isDev && this.state.error?.message && (
            <p
              style={{
                fontSize: 11,
                color: rgba(T.danger, 0.75),
                maxWidth: 480,
                textAlign: 'center',
                margin: 0,
                wordBreak: 'break-all',
              }}
            >
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              borderRadius: 8,
              border: `1px solid ${rgba(T.fg, 0.15)}`,
              background: rgba(T.fg, 0.07),
              color: rgba(T.fg, 0.75),
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
