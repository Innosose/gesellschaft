import { useCallback } from 'react'

export interface FileDialogOptions {
  /** 선택 모드: 'directory' | 'file' (현재 IPC는 directory만 지원) */
  mode?: 'directory'
}

/**
 * useFileDialog(options?)
 *
 * 파일/폴더 선택 다이얼로그 공통 로직 캡슐화.
 *
 * @example
 * const { openDirectory } = useFileDialog()
 * const dir = await openDirectory()
 * if (dir) setWorkDir(dir)
 */
export function useFileDialog(_options: FileDialogOptions = {}) {
  const openDirectory = useCallback(async (): Promise<string | null> => {
    try {
      return await window.api.dialog.openDirectory()
    } catch {
      return null
    }
  }, [])

  return { openDirectory }
}
