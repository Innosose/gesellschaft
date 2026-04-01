import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface MNode { id: number; label: string; parentId: number | null; collapsed: boolean }
interface MindMap { id: number; name: string; nodes: MNode[] }

const SK = 'gs-mindmaps'
let nid = 1

function load(): MindMap[] {
  try {
    const r = localStorage.getItem(SK)
    if (!r) return []
    const maps = JSON.parse(r) as MindMap[]
    const allIds = maps.flatMap(m => m.nodes.map(n => n.id))
    nid = Math.max(...allIds, 0) + 1
    return maps
  } catch { return [] }
}

function save(maps: MindMap[]) { localStorage.setItem(SK, JSON.stringify(maps)) }

export default function MindMapModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [maps, setMaps] = useState<MindMap[]>(load)
  const [activeId, setActiveId] = useState<number | null>(maps[0]?.id ?? null)
  const [newName, setNewName] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [selectedNode, setSelectedNode] = useState<number | null>(null)

  useEffect(() => { save(maps) }, [maps])

  const activeMap = maps.find(m => m.id === activeId) ?? null

  const addMap = useCallback(() => {
    const name = newName.trim() || '새 마인드맵'
    const id = Date.now()
    const root: MNode = { id: nid++, label: name, parentId: null, collapsed: false }
    setMaps(p => [...p, { id, name, nodes: [root] }])
    setActiveId(id)
    setNewName('')
  }, [newName])

  const deleteMap = useCallback((mid: number) => {
    setMaps(p => p.filter(m => m.id !== mid))
    if (activeId === mid) setActiveId(null)
  }, [activeId])

  const addNode = useCallback(() => {
    if (!activeMap || selectedNode === null || !addLabel.trim()) return
    const newNode: MNode = { id: nid++, label: addLabel.trim(), parentId: selectedNode, collapsed: false }
    setMaps(p => p.map(m => m.id === activeId ? { ...m, nodes: [...m.nodes, newNode] } : m))
    setAddLabel('')
  }, [activeMap, activeId, selectedNode, addLabel])

  const deleteNode = useCallback((nodeId: number) => {
    if (!activeMap) return
    const toRemove = new Set<number>()
    const collect = (id: number) => { toRemove.add(id); activeMap.nodes.filter(n => n.parentId === id).forEach(n => collect(n.id)) }
    collect(nodeId)
    setMaps(p => p.map(m => m.id === activeId ? { ...m, nodes: m.nodes.filter(n => !toRemove.has(n.id)) } : m))
    if (selectedNode !== null && toRemove.has(selectedNode)) setSelectedNode(null)
  }, [activeMap, activeId, selectedNode])

  const toggleCollapse = useCallback((nodeId: number) => {
    setMaps(p => p.map(m => m.id === activeId ? { ...m, nodes: m.nodes.map(n => n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n) } : m))
  }, [activeId])

  const renderTree = (nodes: MNode[], parentId: number | null, depth: number): React.ReactNode => {
    const children = nodes.filter(n => n.parentId === parentId)
    if (children.length === 0) return null
    const parent = nodes.find(n => n.id === parentId)
    if (parent?.collapsed) return null
    return children.map(node => {
      const hasKids = nodes.some(n => n.parentId === node.id)
      const isSel = selectedNode === node.id
      return (
        <div key={node.id} style={{ marginLeft: depth * 24 }}>
          <div
            onClick={() => setSelectedNode(node.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
              background: isSel ? rgba(T.teal, 0.25) : rgba(T.fg, 0.04),
              border: isSel ? `1px solid ${rgba(T.teal, 0.5)}` : '1px solid transparent', marginBottom: 3,
            }}
          >
            {hasKids && (
              <span onClick={e => { e.stopPropagation(); toggleCollapse(node.id) }} style={{ cursor: 'pointer', fontSize: 10, color: rgba(T.fg, 0.5), width: 14 }}>
                {node.collapsed ? '▶' : '▼'}
              </span>
            )}
            {!hasKids && <span style={{ width: 14, display: 'inline-block', fontSize: 10, color: rgba(T.fg, 0.3) }}>•</span>}
            <span style={{ fontSize: 13, fontWeight: parentId === null ? 700 : 500, color: parentId === null ? T.teal : 'var(--win-text)' }}>{node.label}</span>
            {parentId !== null && (
              <button onClick={e => { e.stopPropagation(); deleteNode(node.id) }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: rgba(T.fg, 0.3), cursor: 'pointer', fontSize: 11 }}>✕</button>
            )}
          </div>
          {renderTree(nodes, node.id, depth + 1)}
        </div>
      )
    })
  }

  return (
    <Modal title="마인드맵" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* map selector */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {maps.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={() => { setActiveId(m.id); setSelectedNode(null) }} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: activeId === m.id ? rgba(T.fg, 0.12) : 'transparent',
                color: activeId === m.id ? T.fg : rgba(T.fg, 0.45),
              }}>{m.name}</button>
              <button onClick={() => deleteMap(m.id)} style={{ background: 'none', border: 'none', color: rgba(T.fg, 0.3), cursor: 'pointer', fontSize: 10 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4 }}>
            <input className="win-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="맵 이름" style={{ width: 100, fontSize: 12 }} onKeyDown={e => e.key === 'Enter' && addMap()} />
            <button className="win-btn-primary" onClick={addMap} style={{ fontSize: 11, padding: '3px 10px' }}>+ 새 맵</button>
          </div>
        </div>

        {!activeMap && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', padding: 40, fontSize: 13 }}>마인드맵을 선택하거나 새로 만드세요</div>}

        {activeMap && (
          <>
            {/* add node */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--win-text-muted)', whiteSpace: 'nowrap' }}>
                선택: {selectedNode !== null ? activeMap.nodes.find(n => n.id === selectedNode)?.label ?? '-' : '(노드를 클릭)'}
              </span>
              <input className="win-input" value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="하위 노드 이름" style={{ flex: 1, fontSize: 12 }} onKeyDown={e => e.key === 'Enter' && addNode()} />
              <button className="win-btn-primary" onClick={addNode} disabled={selectedNode === null || !addLabel.trim()} style={{ fontSize: 11, padding: '3px 10px' }}>추가</button>
            </div>

            {/* tree */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 12 }}>
              {activeMap.nodes.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 30 }}>비어있음</div>
                : renderTree(activeMap.nodes, null, 0)}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
