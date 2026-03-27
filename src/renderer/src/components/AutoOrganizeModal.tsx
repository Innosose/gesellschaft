import React, { useState, useEffect } from 'react'
import { Modal } from './SearchModal'

export default function AutoOrganizeModal({ onClose }: { onClose: () => void }): React.ReactElement {
  const [rules, setRules] = useState<OrganizeRule[]>([])
  const [editing, setEditing] = useState<OrganizeRule | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ ruleId: string; count: number; errors: number } | null>(null)

  useEffect(() => {
    window.api.organize.getRules().then((r: OrganizeRule[]) => setRules(r))
  }, [])

  const saveRule = async (rule: OrganizeRule): Promise<void> => {
    await window.api.organize.saveRule(rule)
    const updated = await window.api.organize.getRules()
    setRules(updated)
    setEditing(null)
  }

  const deleteRule = async (ruleId: string): Promise<void> => {
    if (!window.confirm('이 규칙을 삭제하시겠습니까?')) return
    await window.api.organize.deleteRule(ruleId)
    setRules((r) => r.filter((x) => x.id !== ruleId))
  }

  const runRule = async (rule: OrganizeRule): Promise<void> => {
    setRunning(rule.id)
    const res = await window.api.organize.runRule(rule)
    setRunning(null)
    if (res.success) {
      const errors = res.results.filter((r: { success: boolean }) => !r.success).length
      setLastResult({ ruleId: rule.id, count: res.results.length, errors })
    }
  }

  const newRule = (): OrganizeRule => ({
    id: `rule-${Date.now()}`,
    name: '새 규칙',
    enabled: true,
    sourceDir: '',
    conditions: [{ type: 'extension', value: '.jpg,.png' }],
    action: { type: 'move', targetDir: '', createSubfolder: 'none' }
  })

  if (editing) {
    return (
      <Modal title="규칙 편집" onClose={() => setEditing(null)}>
        <RuleEditor rule={editing} onSave={saveRule} onCancel={() => setEditing(null)} />
      </Modal>
    )
  }

  return (
    <Modal title="자동 정리 규칙" onClose={onClose} wide>
      <div className="space-y-3">
        <div className="flex justify-end">
          <button className="win-btn-primary text-sm" onClick={() => setEditing(newRule())}>
            + 새 규칙 추가
          </button>
        </div>

        {rules.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--win-text-muted)' }}>
            <div className="text-4xl mb-2">⚡</div>
            <div className="text-sm">규칙을 추가하면 파일을 자동으로 정리할 수 있습니다.</div>
          </div>
        )}

        {rules.map((rule) => (
          <div key={rule.id} className="rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--win-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => {
                    const updated = { ...rule, enabled: e.target.checked }
                    saveRule(updated)
                  }}
                  className="accent-[#0078d4]"
                />
                <span className="font-medium text-sm">{rule.name}</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  className="win-btn-primary text-xs"
                  disabled={running === rule.id}
                  onClick={() => runRule(rule)}
                >
                  {running === rule.id ? '실행 중...' : '▶ 실행'}
                </button>
                <button className="win-btn-secondary text-xs" onClick={() => setEditing(rule)}>편집</button>
                <button className="win-btn-danger text-xs" onClick={() => deleteRule(rule.id)}>삭제</button>
              </div>
            </div>

            <div className="text-xs space-y-0.5" style={{ color: 'var(--win-text-muted)' }}>
              <div>📂 원본: <span style={{ color: 'var(--win-text)' }}>{rule.sourceDir || '(미설정)'}</span></div>
              <div>
                🔍 조건:{' '}
                <span style={{ color: 'var(--win-text)' }}>
                  {rule.conditions.map((c) => `${c.type}: ${c.value}`).join(', ')}
                </span>
              </div>
              <div>
                ⚡ 작업:{' '}
                <span style={{ color: 'var(--win-text)' }}>
                  {rule.action.type === 'move' ? '이동' : '복사'} → {rule.action.targetDir || '(미설정)'}
                  {rule.action.createSubfolder && rule.action.createSubfolder !== 'none'
                    ? ` (하위폴더: ${rule.action.createSubfolder})`
                    : ''}
                </span>
              </div>
            </div>

            {lastResult?.ruleId === rule.id && (
              <div className={`text-xs px-2 py-1 rounded ${lastResult.errors > 0 ? 'bg-[#c42b1c20] text-[#c42b1c]' : 'bg-[#0078d420] text-[#0078d4]'}`}>
                완료: {lastResult.count}개 처리
                {lastResult.errors > 0 ? ` (오류 ${lastResult.errors}개)` : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

function RuleEditor({
  rule,
  onSave,
  onCancel
}: {
  rule: OrganizeRule
  onSave: (r: OrganizeRule) => void
  onCancel: () => void
}): React.ReactElement {
  const [draft, setDraft] = useState<OrganizeRule>({ ...rule, conditions: [...rule.conditions] })

  const addCondition = (): void => {
    setDraft((d) => ({
      ...d,
      conditions: [...d.conditions, { type: 'extension', value: '' }]
    }))
  }

  const removeCondition = (idx: number): void => {
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.filter((_, i) => i !== idx)
    }))
  }

  const updateCondition = (idx: number, patch: Partial<OrganizeRule['conditions'][0]>): void => {
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="text-xs w-16 pt-2 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>이름</label>
        <input
          className="win-input flex-1 text-sm"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>

      <div className="flex gap-2">
        <label className="text-xs w-16 pt-2 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>원본 폴더</label>
        <input
          className="win-input flex-1 text-sm"
          value={draft.sourceDir}
          onChange={(e) => setDraft({ ...draft, sourceDir: e.target.value })}
          placeholder="C:\Users\..."
        />
        <button
          className="win-btn-secondary text-xs"
          onClick={async () => {
            const dir = await window.api.dialog.openDirectory()
            if (dir) setDraft({ ...draft, sourceDir: dir })
          }}
        >
          찾기
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs" style={{ color: 'var(--win-text-muted)' }}>조건 (모두 만족해야 적용)</label>
          <button className="text-xs text-[#0078d4] hover:underline" onClick={addCondition}>+ 추가</button>
        </div>
        {draft.conditions.map((cond, idx) => (
          <div key={idx} className="flex gap-2 mb-1.5">
            <select
              className="win-input text-xs w-36"
              value={cond.type}
              onChange={(e) => updateCondition(idx, { type: e.target.value as OrganizeRule['conditions'][0]['type'] })}
            >
              <option value="extension">확장자</option>
              <option value="name_contains">이름 포함</option>
              <option value="size_gt">크기 초과 (bytes)</option>
              <option value="size_lt">크기 미만 (bytes)</option>
              <option value="older_than">N일 이상 경과</option>
              <option value="newer_than">N일 이내</option>
            </select>
            <input
              className="win-input flex-1 text-xs"
              value={cond.value}
              onChange={(e) => updateCondition(idx, { value: e.target.value })}
              placeholder={cond.type === 'extension' ? '.jpg,.png,.gif' : '값'}
            />
            <button
              className="text-xs"
              style={{ color: 'var(--win-danger)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
              onClick={() => removeCondition(idx)}
            >✕</button>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs block mb-2" style={{ color: 'var(--win-text-muted)' }}>작업</label>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <select
              className="win-input text-xs w-24"
              value={draft.action.type}
              onChange={(e) => setDraft({ ...draft, action: { ...draft.action, type: e.target.value as 'move' | 'copy' } })}
            >
              <option value="move">이동</option>
              <option value="copy">복사</option>
            </select>
            <input
              className="win-input flex-1 text-xs"
              value={draft.action.targetDir}
              onChange={(e) => setDraft({ ...draft, action: { ...draft.action, targetDir: e.target.value } })}
              placeholder="대상 폴더 경로"
            />
            <button
              className="win-btn-secondary text-xs"
              onClick={async () => {
                const dir = await window.api.dialog.openDirectory()
                if (dir) setDraft({ ...draft, action: { ...draft.action, targetDir: dir } })
              }}
            >
              찾기
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24" style={{ color: 'var(--win-text-muted)' }}>하위 폴더 생성</label>
            <select
              className="win-input text-xs flex-1"
              value={draft.action.createSubfolder || 'none'}
              onChange={(e) => setDraft({ ...draft, action: { ...draft.action, createSubfolder: e.target.value } })}
            >
              <option value="none">없음</option>
              <option value="extension">확장자별</option>
              <option value="date">날짜별 (년-월)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button className="win-btn-secondary text-sm" onClick={onCancel}>취소</button>
        <button className="win-btn-primary text-sm" onClick={() => onSave(draft)}>저장</button>
      </div>
    </div>
  )
}
