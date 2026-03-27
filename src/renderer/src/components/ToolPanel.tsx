import React, { useState } from 'react'
import SettingsPanel from './SettingsPanel'
import SearchModal from './SearchModal'
import CadConvertModal from './CadConvertModal'
import BulkRenameModal from './BulkRenameModal'
import FolderCompareModal from './FolderCompareModal'
import ReminderModal from './ReminderModal'
import ClipboardModal from './ClipboardModal'
import QuickNotesModal from './QuickNotesModal'
import TodoModal from './TodoModal'
import TextToolsModal from './TextToolsModal'
import PdfToolModal from './PdfToolModal'
import ImageConvertModal from './ImageConvertModal'
import ExcelToolModal from './ExcelToolModal'
import TranslateModal from './TranslateModal'
import SnippetsModal from './SnippetsModal'
import EmailTemplateModal from './EmailTemplateModal'
import DateCalcModal from './DateCalcModal'
import UnitConverterModal from './UnitConverterModal'
import ExchangeRateModal from './ExchangeRateModal'
import VatCalcModal from './VatCalcModal'
import QrCodeModal from './QrCodeModal'
import ColorPickerModal from './ColorPickerModal'
import OcrModal from './OcrModal'
import AiPanel from './AiPanel'
// AiPanel still imported for asPanel (ai tool)

interface ToolPanelProps {
  toolId: string
  toolColor: string
  toolLabel: string
  onBack: () => void
  hubColor?: string
  hubSize?: number
  overlayOpacity?: number
  spiralScale?: number
  animSpeed?: 'slow' | 'normal' | 'fast'
  onThemeChange?: (color: string) => void
  onDisplayChange?: (patch: Record<string, unknown>) => void
}

export default function ToolPanel({
  toolId,
  toolColor,
  toolLabel,
  onBack,
  hubColor,
  hubSize,
  overlayOpacity,
  spiralScale,
  animSpeed,
  onThemeChange,
  onDisplayChange,
}: ToolPanelProps): React.ReactElement {
  const [folder, setFolder] = useState('')

  const folderTools = ['search', 'bulkRename', 'folderCompare']
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

        {/* Tool content */}
        <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          {toolId === 'settings' && hubColor !== undefined && (
            <SettingsPanel
              hubColor={hubColor}
              hubSize={hubSize ?? 130}
              overlayOpacity={overlayOpacity ?? 0.91}
              spiralScale={spiralScale ?? 1.05}
              animSpeed={animSpeed ?? 'normal'}
              onThemeChange={onThemeChange ?? (() => {})}
              onDisplayChange={onDisplayChange as ((patch: Partial<{hubSize:number;overlayOpacity:number;spiralScale:number;animSpeed:'slow'|'normal'|'fast'}>) => void) ?? (() => {})}
            />
          )}
          {toolId === 'ai' && <AiPanel asPanel onClose={onBack} />}
          {toolId === 'search'        && <SearchModal        onClose={onBack} initialFolder={folder} asPanel />}
          {toolId === 'cadConvert'    && <CadConvertModal    onClose={onBack} asPanel />}
          {toolId === 'bulkRename'    && <BulkRenameModal    onClose={onBack} initialFolder={folder} asPanel />}
          {toolId === 'folderCompare' && <FolderCompareModal onClose={onBack} initialFolder={folder} asPanel />}
          {toolId === 'reminder'      && <ReminderModal      onClose={onBack} asPanel />}
          {toolId === 'clipboard'     && <ClipboardModal     onClose={onBack} asPanel />}
          {toolId === 'notes'         && <QuickNotesModal    onClose={onBack} asPanel />}
          {toolId === 'todo'          && <TodoModal          onClose={onBack} asPanel />}
          {toolId === 'textTools'     && <TextToolsModal     onClose={onBack} asPanel />}
          {toolId === 'pdfTool'       && <PdfToolModal       onClose={onBack} asPanel />}
          {toolId === 'imageConvert'  && <ImageConvertModal  onClose={onBack} asPanel />}
          {toolId === 'excelTool'     && <ExcelToolModal     onClose={onBack} asPanel />}
          {toolId === 'translate'     && <TranslateModal     onClose={onBack} asPanel />}
          {toolId === 'snippets'      && <SnippetsModal      onClose={onBack} asPanel />}
          {toolId === 'emailTemplate' && <EmailTemplateModal onClose={onBack} asPanel />}
          {toolId === 'dateCalc'      && <DateCalcModal      onClose={onBack} asPanel />}
          {toolId === 'unitConverter' && <UnitConverterModal onClose={onBack} asPanel />}
          {toolId === 'exchangeRate'  && <ExchangeRateModal  onClose={onBack} asPanel />}
          {toolId === 'vatCalc'       && <VatCalcModal       onClose={onBack} asPanel />}
          {toolId === 'qrCode'        && <QrCodeModal        onClose={onBack} asPanel />}
          {toolId === 'colorPicker'   && <ColorPickerModal   onClose={onBack} asPanel />}
          {toolId === 'ocr'           && <OcrModal           onClose={onBack} asPanel />}
        </div>
      </div>

    </div>
  )
}
