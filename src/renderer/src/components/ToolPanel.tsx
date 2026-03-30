import React, { useState } from 'react'
import SettingsPanel from './SettingsPanel'
import CadConvertModal from './CadConvertModal'
import ClipboardModal from './ClipboardModal'
import TodoModal from './TodoModal'
import TextToolsModal from './TextToolsModal'
import PdfToolModal from './PdfToolModal'
import ExcelToolModal from './ExcelToolModal'
import TranslateModal from './TranslateModal'
import AiPanel from './AiPanel'
import MeetingTimerModal from './MeetingTimerModal'
import SalaryCalcModal from './SalaryCalcModal'
import CalculatorModal from './CalculatorModal'
import DateToolsModal from './DateToolsModal'
import MemoAlarmModal from './MemoAlarmModal'
import DocTemplateModal from './DocTemplateModal'
import FileManagerModal from './FileManagerModal'
import ImageToolsModal from './ImageToolsModal'
import ErrorBoundary from './ErrorBoundary'
import { useAppStore } from '../store/appStore'

interface ToolPanelProps {
  toolId: string
  toolColor: string
  toolLabel: string
  onBack: () => void
}

export default function ToolPanel({
  toolId,
  toolColor,
  toolLabel,
  onBack,
}: ToolPanelProps): React.ReactElement {
  const { hubColor } = useAppStore()
  const [folder, setFolder] = useState('')

  const folderTools = ['fileManager']
  const showFolder = folderTools.includes(toolId)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        animation: 'panelSlideIn 0.32s cubic-bezier(0.2,0,0,1) both',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(6,5,15,0.92)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={onBack}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          margin: 'auto',
          width: '82vw',
          maxWidth: 1100,
          height: '82vh',
          borderRadius: 16,
          border: `1px solid ${toolColor}40`,
          background: 'rgba(14,12,26,0.97)',
          boxShadow: `0 0 80px ${toolColor}20, 0 32px 80px rgba(0,0,0,0.7)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel top bar */}
        <div
          style={{
            height: 48,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px',
            borderBottom: `1px solid ${toolColor}30`,
            background: `linear-gradient(90deg, ${toolColor}18, transparent)`,
          }}
        >
          {/* Back button */}
          <button
            onClick={onBack}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
          >
            ←
          </button>

          {/* Accent dot + label */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: toolColor,
              boxShadow: `0 0 8px ${toolColor}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.88)',
              letterSpacing: '0.02em',
              flex: 1,
            }}
          >
            {toolLabel}
          </span>

          {/* Folder input for file tools */}
          {showFolder && toolId !== 'settings' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="win-input"
                value={folder}
                onChange={e => setFolder(e.target.value)}
                placeholder="작업 폴더 경로..."
                style={{ height: 28, width: 260, padding: '3px 10px', fontSize: 12 }}
              />
              <button
                className="win-btn-secondary"
                style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                onClick={async () => {
                  const dir = await window.api.dialog.openDirectory()
                  if (dir) setFolder(dir)
                }}
              >
                찾기
              </button>
            </div>
          )}
        </div>

        {/* Tool content — ErrorBoundary로 감싸 개별 도구 크래시가 앱 전체에 영향 없도록 */}
        <ErrorBoundary>
        <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          {toolId === 'settings'      && <SettingsPanel />}
          {toolId === 'ai'            && <AiPanel          asPanel onClose={onBack} />}
          {toolId === 'todo'          && <TodoModal        onClose={onBack} asPanel />}
          {toolId === 'clipboard'     && <ClipboardModal   onClose={onBack} asPanel />}
          {toolId === 'memoAlarm'     && <MemoAlarmModal   onClose={onBack} asPanel />}
          {toolId === 'docTemplate'   && <DocTemplateModal onClose={onBack} asPanel />}
          {toolId === 'meetingTimer'  && <MeetingTimerModal onClose={onBack} asPanel />}
          {toolId === 'dateTools'     && <DateToolsModal   onClose={onBack} asPanel />}
          {toolId === 'translate'     && <TranslateModal   onClose={onBack} asPanel />}
          {toolId === 'salaryCalc'    && <SalaryCalcModal  onClose={onBack} asPanel />}
          {toolId === 'calculator'    && <CalculatorModal  onClose={onBack} asPanel />}
          {toolId === 'pdfTool'       && <PdfToolModal     onClose={onBack} asPanel />}
          {toolId === 'excelTool'     && <ExcelToolModal   onClose={onBack} asPanel />}
          {toolId === 'imageTools'    && <ImageToolsModal  onClose={onBack} asPanel />}
          {toolId === 'textTools'     && <TextToolsModal   onClose={onBack} asPanel />}
          {toolId === 'fileManager'   && <FileManagerModal onClose={onBack} asPanel />}
          {toolId === 'cadConvert'    && <CadConvertModal  onClose={onBack} asPanel />}
        </div>
        </ErrorBoundary>
      </div>
    </div>
  )
}
