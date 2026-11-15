import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'

interface Props {
  opened: OpenedRom
}

const ROW = 16

export default function HexViewer({ opened }: Props) {
  const { rom } = opened
  const [offset, setOffset] = useState(0)
  const [jump, setJump] = useState('')

  const dirty = useMemo(() => new Set(rom.getDirtyRanges().flatMap(([a, b]) => range(a, b))), [opened, offset])

  const rows = 32
  const start = Math.max(0, Math.min(offset, rom.size - rows * ROW))
  const lines: Array<{ addr: number; hex: string[]; ascii: string }> = []
  for (let r = 0; r < rows; r++) {
    const addr = start + r * ROW
    if (addr >= rom.size) break
    const bytes: number[] = []
    let ascii = ''
    for (let i = 0; i < ROW; i++) {
      const b = rom.readU8(addr + i)
      bytes.push(b)
      ascii += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.'
    }
    lines.push({ addr, hex: bytes.map((b) => b.toString(16).padStart(2, '0')), ascii })
  }

  function doJump() {
    const s = jump.trim().replace(/^0x/i, '')
    if (/^[0-9a-f]+$/i.test(s)) {
      setOffset(parseInt(s, 16))
    }
  }

  function range(a: number, b: number): number[] {
    const out: number[] = []
    for (let i = a; i <= b; i++) out.push(i)
    return out
  }

  return (
    <>
      <div className="searchbar">
        <button className="secondary" onClick={() => setOffset(Math.max(0, offset - rows * ROW))}>◀ 上一页</button>
        <button className="secondary" onClick={() => setOffset(Math.min(rom.size - 1, offset + rows * ROW))}>下一页 ▶</button>
        <input
          placeholder="跳转到文件偏移（hex，如 51C70）"
          value={jump}
          onChange={(e) => setJump(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doJump() }}
        />
        <button className="secondary" onClick={doJump}>跳转</button>
        <span className="badge">当前 0x{start.toString(16)} / ROM 大小 0x{rom.size.toString(16)}</span>
      </div>
      <div className="hexview">
        {lines.map((l) => (
          <div key={l.addr}>
            <span className="addr">{l.addr.toString(16).padStart(8, '0')}  </span>
            {l.hex.map((h, i) => (
              <span key={i} className={dirty.has(l.addr + i) ? 'mod' : ''}>{h} </span>
            ))}
            <span className="ascii"> |{l.ascii}|</span>
          </div>
        ))}
      </div>
    </>
  )
}
