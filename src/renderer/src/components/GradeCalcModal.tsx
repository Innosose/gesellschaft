import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'

interface Course {
  id: number
  name: string
  credits: string
  grade: string
}

const GRADES: { label: string; value: number }[] = [
  { label: 'A+', value: 4.5 },
  { label: 'A0', value: 4.0 },
  { label: 'B+', value: 3.5 },
  { label: 'B0', value: 3.0 },
  { label: 'C+', value: 2.5 },
  { label: 'C0', value: 2.0 },
  { label: 'D+', value: 1.5 },
  { label: 'D0', value: 1.0 },
  { label: 'F',  value: 0.0 },
]

const GRADE_MAP = new Map(GRADES.map(g => [g.label, g.value]))

let nextId = 1

export default function GradeCalcModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [courses, setCourses] = useState<Course[]>([
    { id: nextId++, name: '', credits: '3', grade: 'A+' },
    { id: nextId++, name: '', credits: '3', grade: 'A+' },
    { id: nextId++, name: '', credits: '3', grade: 'A+' },
  ])
  const [prevGpa, setPrevGpa] = useState('')
  const [prevCredits, setPrevCredits] = useState('')

  const addCourse = (): void => {
    setCourses(prev => [...prev, { id: nextId++, name: '', credits: '3', grade: 'A+' }])
  }

  const removeCourse = (id: number): void => {
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  const updateCourse = (id: number, field: keyof Course, value: string): void => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const result = useMemo(() => {
    let totalPoints = 0
    let totalCredits = 0
    for (const c of courses) {
      const cr = parseFloat(c.credits)
      const gv = GRADE_MAP.get(c.grade) ?? 0
      if (!isNaN(cr) && cr > 0) {
        totalPoints += cr * gv
        totalCredits += cr
      }
    }
    const semesterGpa = totalCredits > 0 ? totalPoints / totalCredits : 0

    // 누적 GPA 계산
    const pGpa = parseFloat(prevGpa)
    const pCr = parseFloat(prevCredits)
    let cumulativeGpa = semesterGpa
    if (!isNaN(pGpa) && !isNaN(pCr) && pCr > 0) {
      cumulativeGpa = (pGpa * pCr + totalPoints) / (pCr + totalCredits)
    }

    return { semesterGpa, cumulativeGpa, totalCredits }
  }, [courses, prevGpa, prevCredits])

  return (
    <Modal title="학점 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        {/* 이전 학기 누적 (선택) */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', whiteSpace: 'nowrap' }}>이전 누적</span>
          <input className="win-input" placeholder="기존 GPA" value={prevGpa} onChange={e => setPrevGpa(e.target.value)} style={{ width: 80, textAlign: 'center' }} />
          <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>/</span>
          <input className="win-input" placeholder="이수 학점" value={prevCredits} onChange={e => setPrevCredits(e.target.value)} style={{ width: 80, textAlign: 'center' }} />
          <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>학점</span>
        </div>

        {/* 과목 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 32px', gap: 8, fontSize: 11, color: 'var(--win-text-muted)', paddingBottom: 4 }}>
            <span>과목명</span><span style={{ textAlign: 'center' }}>학점</span><span style={{ textAlign: 'center' }}>성적</span><span />
          </div>
          {courses.map(c => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 32px', gap: 8, alignItems: 'center' }}>
              <input className="win-input" placeholder="과목명" value={c.name} onChange={e => updateCourse(c.id, 'name', e.target.value)} style={{ fontSize: 13 }} />
              <input className="win-input" type="number" min={1} max={6} value={c.credits} onChange={e => updateCourse(c.id, 'credits', e.target.value)} style={{ textAlign: 'center', fontSize: 13 }} />
              <select className="win-select" value={c.grade} onChange={e => updateCourse(c.id, 'grade', e.target.value)} style={{ fontSize: 13 }}>
                {GRADES.map(g => <option key={g.label} value={g.label}>{g.label} ({g.value})</option>)}
              </select>
              <button className="win-btn-danger" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => removeCourse(c.id)}>×</button>
            </div>
          ))}
          <button className="win-btn-ghost" style={{ fontSize: 12, alignSelf: 'flex-start' }} onClick={addCourse}>+ 과목 추가</button>
        </div>

        {/* 결과 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '이번 학기', value: result.semesterGpa.toFixed(2), color: 'var(--win-accent)' },
            { label: '누적 GPA', value: result.cumulativeGpa.toFixed(2), color: 'var(--win-success)' },
            { label: '이수 학점', value: `${result.totalCredits}학점`, color: 'var(--win-text)' },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, padding: '14px 18px', background: 'var(--win-surface)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
