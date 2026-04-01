import { BrowserWindow, IpcMainInvokeEvent } from 'electron'

export function getWinFromEvent(event: IpcMainInvokeEvent): BrowserWindow {
  return (
    BrowserWindow.fromWebContents(event.sender) ??
    BrowserWindow.getFocusedWindow() ??
    BrowserWindow.getAllWindows()[0]
  )
}
