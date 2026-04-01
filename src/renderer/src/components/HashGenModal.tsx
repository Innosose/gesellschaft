import React, { useState, useCallback, useEffect } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Algorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

async function computeHash(algo: Algorithm, data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest(algo, data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Simple MD5 implementation (SubtleCrypto doesn't support MD5)
function md5(str: string): string {
  function rotl(v: number, s: number) { return (v << s) | (v >>> (32 - s)) }
  function toWords(s: string): number[] {
    const l = s.length * 8
    const arr: number[] = []
    for (let i = 0; i < s.length; i++) arr[i >> 2] |= (s.charCodeAt(i) & 0xff) << ((i % 4) * 8)
    arr[s.length >> 2] |= 0x80 << ((s.length % 4) * 8)
    const n = (((s.length + 8) >>> 6) + 1) * 16
    while (arr.length < n) arr.push(0)
    arr[n - 2] = l; return arr
  }
  const K = [
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391,
  ]
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21]
  const words = toWords(str)
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
  for (let i = 0; i < words.length; i += 16) {
    let a = a0, b = b0, c = c0, d = d0
    for (let j = 0; j < 64; j++) {
      let f: number, g: number
      if (j < 16) { f = (b & c) | (~b & d); g = j }
      else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16 }
      else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16 }
      else { f = c ^ (b | ~d); g = (7 * j) % 16 }
      const tmp = d; d = c; c = b; b = (b + rotl((a + f + K[j] + (words[i + g] | 0)) | 0, S[j])) | 0; a = tmp
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0
  }
  return [a0, b0, c0, d0].map(v => {
    let s = ''
    for (let i = 0; i < 4; i++) s += ((v >> (i * 8)) & 0xff).toString(16).padStart(2, '0')
    return s
  }).join('')
}

export default function HashGenModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [input, setInput] = useState('')
  const [hashes, setHashes] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [fileHash, setFileHash] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')

  const computeAll = useCallback(async (text: string) => {
    if (!text) { setHashes({}); return }
    const enc = new TextEncoder().encode(text)
    const [sha1, sha256, sha512] = await Promise.all([
      computeHash('SHA-1', enc),
      computeHash('SHA-256', enc),
      computeHash('SHA-512', enc),
    ])
    setHashes({ MD5: md5(text), 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 })
  }, [])

  useEffect(() => { computeAll(input) }, [input, computeAll])

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const buf = await file.arrayBuffer()
    const [sha1, sha256, sha512] = await Promise.all([
      computeHash('SHA-1', buf),
      computeHash('SHA-256', buf),
      computeHash('SHA-512', buf),
    ])
    // MD5 for file - read as string
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buf)
    setFileHash({ MD5: md5(text), 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 })
  }, [])

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val).then(() => { setCopied(label); setTimeout(() => setCopied(null), 1200) }).catch(() => {})
  }

  const HashRow = ({ label, value, prefix }: { label: string; value: string; prefix: string }) => (
    <div style={{ padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>{label}</span>
        <button onClick={() => copy(value, prefix + label)} style={{ background: 'none', border: 'none', color: copied === prefix + label ? T.success : T.teal, cursor: 'pointer', fontSize: 10, fontWeight: copied === prefix + label ? 700 : 400 }}>
          {copied === prefix + label ? '복사됨 ✓' : '복사'}
        </button>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--win-text-muted)', wordBreak: 'break-all', lineHeight: 1.4 }}>{value}</div>
    </div>
  )

  return (
    <Modal title="해시 생성기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 4, display: 'block' }}>텍스트 입력</label>
          <textarea className="win-textarea" value={input} onChange={e => setInput(e.target.value)} placeholder="해시할 텍스트를 입력하세요..." style={{ width: '100%', minHeight: 70, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {Object.keys(hashes).length > 0 ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: rgba(T.fg, 0.5), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>텍스트 해시</div>
              {Object.entries(hashes).map(([k, v]) => <HashRow key={k} label={k} value={v} prefix="t-" />)}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 30 }}>텍스트를 입력하면 해시가 생성됩니다</div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: rgba(T.fg, 0.5), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>파일 해시</div>
            <label className="win-btn-secondary" style={{ display: 'inline-block', cursor: 'pointer', fontSize: 12 }}>
              파일 선택
              <input type="file" onChange={handleFile} style={{ display: 'none' }} />
            </label>
            {fileName && <span style={{ fontSize: 11, color: 'var(--win-text-muted)', marginLeft: 8 }}>{fileName}</span>}
            {Object.keys(fileHash).length > 0 && (
              <div style={{ marginTop: 10 }}>
                {Object.entries(fileHash).map(([k, v]) => <HashRow key={k} label={k} value={v} prefix="f-" />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
