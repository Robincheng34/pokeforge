import { useState } from 'react'
import type { OpenedRom } from '../App'
import { readMovesTable, writeMoveField } from '@core/profiles'
import { moveName } from '@core/names'
import { TypeBadge, effectEmoji } from './badges'
import moveEffects from '@core/move-effects.json'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const EFFECTS = moveEffects as Array<{ id: number; name: string; zh: string }>
export function effectZh(id: number): string {
  return EFFECTS[id]?.zh ?? `效果${id}`
}

export default function MovesEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [filter, setFilter] = useState('')

  if (!profile.moves) {
    return (
      <div className="empty">
        <h2>招式表不可用</h2>
        <p>当前 ROM 通过特征扫描加载，招式表偏移未知（改版可能移位）。后续版本将支持招式表扫描。</p>
      </div>
    )
  }

  const entries = readMovesTable(rom, profile.moves)
  const filtered = entries.filter((e) => {
    if (!filter.trim()) return true
    const q = filter.trim().toLowerCase()
    return String(e.index) === q || moveName(e.index).includes(q)
  })

  function update(entryIndex: number, key: string, raw: string) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v)) return
    // Gen1/2 命中率与附加概率按 percent 宏缩放存储（100% = 0xFF），输入按百分比换算
    if ((key === 'accuracy' || key === 'chance') && profile.gen !== 3) {
      if (v < 0 || v > 100) return
      writeMoveField(rom, profile.moves!, entryIndex, key, Math.round((v * 255) / 100))
    } else {
      if (v < 0 || v > 255) return
      writeMoveField(rom, profile.moves!, entryIndex, key, v)
    }
    onChange()
  }

  function changeEffect(entryIndex: number, raw: string) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 0 || v > 255) return
    writeMoveField(rom, profile.moves!, entryIndex, 'effect', v)
    onChange()
  }

  const fields = profile.moves.fields.filter((f) => f.key !== 'anim' && f.key !== 'effect')

  return (
    <>
      <div className="searchbar">
        <input placeholder="按编号或名称过滤，如：1 / 拍击" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="badge">{filtered.length} 条 · 表首 0x{profile.moves.offset.toString(16)} · {profile.moves.entrySize}B/条</span>
      </div>
      <table className="grid">
        <thead>
            <tr>
            <th>ID</th>
            <th>名称</th>
            {profile.gen === 2 && <th>效果说明</th>}
            {fields.map((f) => (
              <th key={f.key}>{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <tr key={e.index}>
              <td>{e.index}</td>
              <td className="name">{moveName(e.index)}</td>
              {profile.gen === 2 && (
                <td style={{ textAlign: 'left' }}>
                  <select
                    value={e.values.effect ?? 0}
                    onChange={(ev) => changeEffect(e.index, ev.target.value)}
                    style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto', textAlign: 'left' }}
                    title={`效果字节 = 0x${(e.values.effect ?? 0).toString(16)}`}
                  >
                    {EFFECTS.map((ef) => (
                      <option key={ef.id} value={ef.id}>{effectEmoji(ef.zh)} {ef.id === 0 ? '' : `${ef.id}. `}{ef.zh}</option>
                    ))}
                  </select>
                </td>
              )}
              {fields.map((f) => {
                const v = e.values[f.key] ?? 0
                return f.enum ? (
                  <td key={f.key}>
                    <span className="pf-icon-cell">
                    {f.key === 'type' && <TypeBadge id={v} label={f.enum[v] ?? '?'} />}
                    <select
                      value={v}
                      style={{ flex: 1, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px' }}
                      onChange={(ev) => update(e.index, f.key, ev.target.value)}
                    >
                      {Object.entries(f.enum).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                    </span>
                  </td>
                ) : (f.key === 'accuracy' || f.key === 'chance') && profile.gen !== 3 ? (
                  <td key={f.key}>
                    <input
                      defaultValue={Math.round((v * 100) / 255)}
                      key={`${e.index}-${f.key}-${v}`}
                      onBlur={(ev) => update(e.index, f.key, ev.target.value)}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur() }}
                      style={{ width: 48 }}
                      title={`原始字节 0x${v.toString(16)}（${v}/255），按百分比输入`}
                    />
                    <span style={{ color: 'var(--muted)', marginLeft: 2 }}>%</span>
                  </td>
                ) : (
                  <td key={f.key}>
                    <input
                      defaultValue={v}
                      key={`${e.index}-${f.key}-${v}`}
                      onBlur={(ev) => update(e.index, f.key, ev.target.value)}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur() }}
                      title={f.note ? `(${f.note})` : ''}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
