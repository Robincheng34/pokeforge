import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { readSpeciesTable, writeSpeciesField, type FieldDef, type SpeciesEntry } from '@core/profiles'
import { speciesName } from '@core/names'
import PFIcon from './PFIcon'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

function cellLabel(f: FieldDef, value: number): string {
  return f.enum?.[value] ?? String(value)
}

export default function SpeciesEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [filter, setFilter] = useState('')
  const entries = useMemo(() => readSpeciesTable(rom, profile.baseStats), [rom, profile.baseStats])

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries.filter((e: SpeciesEntry) => e.index > 0)
    const q = filter.trim().toLowerCase()
    return entries.filter(
      (e: SpeciesEntry) => e.index > 0 && (String(e.index) === q || speciesName(e.index).includes(q) || String(e.index).includes(q))
    )
  }, [entries, filter])

  function update(entry: SpeciesEntry, key: string, raw: string, max: number) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 0 || v > max) return
    writeSpeciesField(rom, profile.baseStats, entry.index, key, v)
    onChange()
  }

  const fields = profile.baseStats.fields.filter((f) => f.key !== 'dex')

  return (
    <>
      <div className="searchbar">
        <input placeholder="按图鉴编号或名称过滤，如：25 / 皮卡丘" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="badge">{filtered.length} 条记录 · 表首 0x{profile.baseStats.offset.toString(16)} · {profile.baseStats.entrySize}B/条</span>
      </div>
      <table className="grid">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            {fields.map((f) => (
              <th key={f.key}>{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <tr key={e.index}>
              <td>{e.index}</td>
              <td className="name"><span className="pf-icon-cell"><PFIcon kind="pokemon" id={e.index} size={40} /><span className="pf-name-text">{speciesName(e.index)}</span></span></td>
              {fields.map((f) => {
                const v = e.values[f.key] ?? 0
                const max = f.enum ? 255 : 255
                const isEnum = !!f.enum
                return (
                  <td key={f.key}>
                    {isEnum ? (
                      <select
                        value={v}
                        style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px' }}
                        onChange={(ev) => update(e, f.key, ev.target.value, 255)}
                      >
                        {Object.entries(f.enum!).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        defaultValue={v}
                        key={`${e.index}-${f.key}-${v}`}
                        onBlur={(ev) => update(e, f.key, ev.target.value, max)}
                        onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur() }}
                        title={cellLabel(f, v) + (f.note ? ` (${f.note})` : '')}
                      />
                    )}
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
