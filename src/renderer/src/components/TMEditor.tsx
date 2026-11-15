import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { readTMHMBits, writeTMHMBit, TM_MOVES, TM_MOVES_GEN1, findTMCompatCheck, isTMCompatPatched, setTMCompatIgnored } from '@core/trainers'
import { moveName } from '@core/names'
import { speciesName } from '@core/names'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

function tmLabel(isGen1: boolean, tm: { id: number; zh: string; moveId?: number }): string {
  if (isGen1) return (tm.zh || 'TM') + ' ' + moveName((tm as { moveId: number }).moveId)
  return (tm.id <= 50 ? 'TM' + String(tm.id).padStart(2, '0') : 'HM' + (tm.id - 50)) + ' ' + tm.zh
}

export default function TMEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [id, setId] = useState(25)
  const [filter, setFilter] = useState('')

  const isGen1 = profile.gen === 1

  if (profile.gen !== 2 && !isGen1) {
    return (
      <div className="empty">
        <h2>招式机（TM/HM）兼容编辑</h2>
        <p>当前版本仅支持 Gen 1（红/绿/蓝/黄）与 Gen 2（金/银/水晶）。Gen 3 使用不同的兼容位结构，后续版本支持。</p>
      </div>
    )
  }

  const bs = profile.baseStats
  const firstId = bs.firstId ?? 0
  const compatBase = isGen1 ? 20 : 0x18
  const flagCount = isGen1 ? 55 : 57
  const bits = useMemo(() => {
    const entry = bs.offset + (id - firstId) * bs.entrySize
    if (!isGen1) return readTMHMBits(rom, bs.offset, bs.entrySize, firstId, id)
    // Gen1：位 n（1 起）在 byte (n-1)>>3 的 bit (n-1)&7
    return Array.from({ length: 55 }, (_, i) => {
      const b = rom.readU8(entry + 20 + (i >> 3))
      return ((b >> (i & 7)) & 1) === 1
    })
  }, [id, rom.modifiedCount, compatBase, flagCount, isGen1])

  function setAllFor(oneId: number, on: boolean) {
    const entry = bs.offset + (oneId - firstId) * bs.entrySize
    if (isGen1) {
      for (let n = 0; n < 55; n++) {
        const o = entry + 20 + (n >> 3)
        rom.writeU8(o, on ? (rom.readU8(o) | (1 << (n & 7))) : (rom.readU8(o) & ~(1 << (n & 7))))
      }
    } else {
      for (let n = 0; n < 57; n++) writeTMHMBit(rom, bs.offset, bs.entrySize, firstId, oneId, n, on)
    }
  }

  function applyAll(allSpecies: boolean, on: boolean) {
    if (allSpecies) {
      if (!window.confirm(on ? '让全部宝可梦都能学习所有招式机/秘传机？' : '清除全部宝可梦的招式机兼容？')) return
      for (let i = 0; i < bs.count; i++) setAllFor(firstId + i, on)
    } else {
      setAllFor(id, on)
    }
    onChange()
  }

  const options = Array.from({ length: bs.count }, (_, i) => i + 1).filter(
    (x) => !filter.trim() || String(x) === filter.trim() || speciesName(x).includes(filter.trim())
  )

  // ---- 无视兼容位补丁 ----
  const patchOffset = useMemo(() => findTMCompatCheck(rom), [opened])
  const patched = patchOffset !== null && isTMCompatPatched(rom, patchOffset)

  return (
    <>
      <div className="searchbar" style={{ flexWrap: 'wrap' }}>
        {isGen1 && (
          <span className="badge" style={{ color: 'var(--muted)' }}>
            Gen1 无需例程补丁：直接改下方兼容位即可（"玩家想学就学"补丁是 Gen2 引擎专用）
          </span>
        )}
        {!isGen1 && (
        <button
          style={patched ? { background: 'var(--ok)' } : {}}
          onClick={() => {
            if (patchOffset === null) return
            if (patched) {
              // 解除补丁：从原始快照恢复 5 字节（ld a,id + call Predef）
              for (let k = 5; k <= 9; k++) rom.writeU8(patchOffset + k, rom.originalByte(patchOffset + k))
            } else {
              setTMCompatIgnored(rom, patchOffset, true)
            }
            onChange()
          }}
          disabled={patchOffset === null}
        >
          {patched ? '✓ 已无视兼容位（点击解除）' : '玩家想学就学（无视兼容位）'}
        </button>
        )}
        {!isGen1 && patchOffset === null && (
          <span className="badge" style={{ color: 'var(--danger)' }}>未找到兼容检查例程（ROM 结构异常）</span>
        )}
      </div>
      <div className="searchbar">
        <select
          value={id}
          onChange={(e) => setId(parseInt(e.target.value, 10))}
          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}
        >
          {options.map((x) => (
            <option key={x} value={x}>#{x} {speciesName(x)}</option>
          ))}
        </select>
        <input placeholder="过滤宝可梦（编号/名称）" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="badge">兼容位 @ 0x{(bs.offset + (id - firstId) * bs.entrySize + compatBase).toString(16)} · {isGen1 ? 'TM01-50 + HM01-05' : 'TM01-50 + HM01-07'}</span>
        <button onClick={() => applyAll(false, true)}>当前宝可梦全兼容</button>
        <button className="secondary" onClick={() => applyAll(false, false)}>清空当前</button>
        <button onClick={() => applyAll(true, true)}>全部宝可梦全兼容</button>
        <button className="secondary" onClick={() => applyAll(true, false)}>全部清空</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, maxWidth: 860 }}>
        {(isGen1 ? TM_MOVES_GEN1 : TM_MOVES).map((tm) => (
          <label
            key={tm.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: bits[tm.id - 1] ? 'rgba(122,162,247,0.18)' : 'var(--panel)',
              border: `1px solid ${bits[tm.id - 1] ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 6, cursor: 'pointer', fontSize: 12.5
            }}
            onClick={() => {
              if (isGen1) {
                const o = bs.offset + (id - firstId) * bs.entrySize + 20 + ((tm.id - 1) >> 3)
                rom.writeU8(o, bits[tm.id - 1] ? (rom.readU8(o) & ~(1 << ((tm.id - 1) & 7))) : (rom.readU8(o) | (1 << ((tm.id - 1) & 7))))
              } else {
                writeTMHMBit(rom, bs.offset, bs.entrySize, bs.firstId ?? 0, id, tm.id - 1, !bits[tm.id - 1])
              }
              onChange()
            }}
          >
            <input type="checkbox" checked={bits[tm.id - 1]} readOnly />
            {'moveId' in tm ? undefined : null}
            <span>
              {tmLabel(isGen1, tm)}
            </span>
          </label>
        ))}
      </div>
      <p style={{ color: 'var(--muted)', marginTop: 12 }}>
        点击方块切换兼容性。勾选 = 该宝可梦可以学习此招式机。改动即时生效（未保存前不会写入文件）。
      </p>
    </>
  )
}
