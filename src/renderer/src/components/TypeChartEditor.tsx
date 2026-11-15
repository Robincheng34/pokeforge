import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { findTypeMatchup, readMatchups, writeMult, typeZh, TYPE_MULT_OPTIONS, type Matchup } from '@core/typechart'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

export default function TypeChartEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [filterAtk, setFilterAtk] = useState('')

  if (profile.gen !== 2) {
    return <div className="empty"><h2>属性相克表</h2><p>当前版本仅支持 Gen 2。</p></div>
  }

  const off = useMemo(() => findTypeMatchup(rom), [opened])
  const matchups = useMemo(() => (off !== null ? readMatchups(rom, off) : []), [off, rom.modifiedCount])
  const filtered = matchups.filter((m: Matchup) => !filterAtk.trim() || typeZh(m.atk).includes(filterAtk.trim()) || typeZh(m.def).includes(filterAtk.trim()))

  return (
    <>
      <div className="searchbar">
        <input placeholder="过滤属性（如：火 / 水 / 龙）" value={filterAtk} onChange={(e) => setFilterAtk(e.target.value)} />
        {off !== null ? (
          <span className="badge">相克表 @ 0x{off.toString(16)} · {matchups.length} 条非默认克制关系</span>
        ) : (
          <span className="badge" style={{ color: 'var(--danger)' }}>未定位相克表</span>
        )}
      </div>
      {off !== null && (
        <>
          <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
            表内只存储非默认的克制关系（未列出的组合都是 ×1 普通）。修改倍率即时生效——例如把「火→水」从减半改成效果绝佳。
          </p>
          <table className="grid">
            <thead>
              <tr>
                <th>攻击属性</th>
                <th>防御属性</th>
                <th>倍率</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={i}>
                  <td className="name">{typeZh(m.atk)}</td>
                  <td className="name">{typeZh(m.def)}</td>
                  <td>
                    <select
                      value={m.mult}
                      onChange={(e) => { writeMult(rom, m, parseInt(e.target.value, 10)); onChange() }}
                      style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                    >
                      {TYPE_MULT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  )
}
