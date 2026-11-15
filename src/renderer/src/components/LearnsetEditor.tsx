import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { resolveEvosTable, readEvosEntryFor } from '@core/evos'
import { speciesName, moveName } from '@core/names'
import BreedingPanel from './BreedingPanel'
import { TypeBadge, effectEmoji } from './badges'
import moveEffects from '@core/move-effects.json'
import { TYPES_GEN12, readMovesTable } from '@core/profiles'
import PFIcon from './PFIcon'
import { itemDisplayName } from '@core/itemattrs'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const MOVE_OPTIONS = Array.from({ length: 254 }, (_, i) => i + 1)

export default function LearnsetEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [id, setId] = useState(1)
  const [filter, setFilter] = useState('')
  const [showSpecial, setShowSpecial] = useState(false)
  const [detailMove, setDetailMove] = useState<number | null>(null)
  const EFFECTS = moveEffects as Array<{ id: number; name: string; zh: string }>
  function readMove(mid: number) {
    if (!profile.moves) return null
    const firstId = profile.moves.firstId ?? 0
    const off = profile.moves.offset + (mid - firstId) * profile.moves.entrySize
    // Gen2 招式 7 字节: anim, effect, power, type, accuracy(percent), pp, chance
    return {
      values: {
        effect: rom.readU8(off + 1),
        power: rom.readU8(off + 2),
        type: rom.readU8(off + 3),
        accuracy: rom.readU8(off + 4),
        pp: rom.readU8(off + 5)
      }
    }
  }

  const isGen1 = profile.gen === 1

  if (profile.gen !== 2 && !isGen1) {
    return (
      <div className="empty">
        <h2>升级技能表</h2>
        <p>当前版本仅支持 Gen 1（红/绿/蓝/黄）与 Gen 2（金/银/水晶）。</p>
      </div>
    )
  }

  const gen = isGen1 ? 1 : 2
  const table = useMemo(() => resolveEvosTable(rom, gen), [opened])
  const entry = useMemo(() => (table ? readEvosEntryFor(rom, table, id, gen) : null), [table, id, rom.modifiedCount])

  function change(off: number, raw: string, max: number) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 1 || v > max) return
    rom.writeU8(off, v)
    onChange()
  }

  const options = Array.from({ length: table?.count ?? 0 }, (_, i) => i + 1).filter(
    (x) => !filter.trim() || String(x) === filter.trim() || speciesName(x).includes(filter.trim())
  )

  return (
    <>
      <div className="searchbar">
        <PFIcon kind="pokemon" id={id} size={48} />
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
        {entry && (
          <span className="badge">
            升级学会 {entry.learns.length} 个招式{entry.evolutions.length ? ` · ${entry.evolutions.length} 条进化` : ' · 不进化'}
          </span>
        )}
        {table && <span className="badge">表 @ 0x{table.tableOffset.toString(16)}</span>}
      </div>

      <div className="searchbar">
        <button className="secondary" onClick={() => setShowSpecial((v) => !v)}>
          {showSpecial ? '收起特殊进化一览' : '📋 全游戏特殊进化一览'}
        </button>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>列出所有「非等级进化」的宝可梦及其进化方式（可跳转上方下拉查看/编辑）</span>
      </div>
      {showSpecial && table && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, maxHeight: 260, overflow: 'auto' }}>
          {Array.from({ length: table.count }, (_, i) => i + 1)
            .map((sid) => ({ sid, e: readEvosEntryFor(rom, table, sid, gen) }))
            .filter(({ e }) => e && e.evolutions.some((ev) => ev.type !== 1))
            .map(({ sid, e }) => (
              <div key={sid} style={{ marginBottom: 6, fontSize: 12.5 }}>
                <strong style={{ color: 'var(--accent)' }}>{speciesName(sid)}</strong>
                {' — '}
                {e!.evolutions.map((ev, k) => (
                  <span key={k} style={{ marginRight: 10 }}>
                    {ev.type === 1 ? '等级' : ev.type === 2 ? '道具' : ev.type === 3 ? '通信' : ev.type === 4 ? '亲密度' : '攻防'}
                    {ev.type === 2 ? '（' + (ev.a === 0xff ? '无道具' : itemDisplayName(ev.a)) + '）' : isGen1 && ev.type === 3 ? '' : ev.a}
                    → {speciesName(ev.b)}
                  </span>
                ))}
              </div>
            ))}
        </div>
      )}
      {entry && table && profile.baseStats.entrySize >= 24 && (
        <BreedingPanel opened={opened} id={id} onChange={onChange} />
      )}

      {entry && (
        <>
          {entry.evolutions.length > 0 && (
            <table className="grid" style={{ marginBottom: 10 }}>
              <thead>
                <tr>
                  <th>进化方式</th>
                  <th>条件参数</th>
                  <th>进化为</th>
                </tr>
              </thead>
              <tbody>
                {entry.evolutions.map((ev, i) => (
                  <tr key={i}>
                    <td className="name">
                      {ev.type === 4 || isGen1 ? (
                        <span style={{ color: 'var(--muted)' }}>
                          {isGen1 ? (ev.type === 1 ? '等级进化' : ev.type === 2 ? '道具进化' : '通信交换进化') : '攻防比较（长度特殊，暂不支持改类型）'}
                        </span>
                      ) : (
                        <select
                          value={ev.type}
                          onChange={(e) => {
                            const nt = parseInt(e.target.value, 10)
                            rom.writeU8(ev.off, nt)
                            // 切换类型时给参数一个合理默认值
                            if (nt === 1 && (ev.a > 100 || ev.a === 0xff)) rom.writeU8(ev.off + 1, 16)
                            if (nt === 4 && ev.a > 3) rom.writeU8(ev.off + 1, 1)
                            onChange()
                          }}
                          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                        >
                          <option value={1}>等级进化</option>
                          <option value={2}>道具进化</option>
                          <option value={3}>通信交换进化</option>
                          <option value={4}>亲密度进化</option>
                          {ev.type === 5 && <option value={5}>攻防比较进化</option>}
                        </select>
                      )}
                    </td>
                    <td>
                      {ev.type <= 3 ? (
                        <input
                          defaultValue={ev.a}
                          key={'evp' + i + '-' + ev.a}
                          style={{ width: 60 }}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10)
                            if (!Number.isNaN(v) && v >= 0 && v <= 255) { rom.writeU8(ev.off + 1, v); onChange() }
                          }}
                          title={ev.type === 0 ? '进化所需等级' : ev.type === 1 ? '触发进化的道具 ID' : ev.type === 3 ? '1=全天 2=白天 3=夜晚' : ''}
                        />
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>{ev.a}</span>
                      )}
                    </td>
                    <td className="name">
                      <select
                        value={ev.b}
                        onChange={(e) => { rom.writeU8(isGen1 && ev.type === 2 ? ev.off + 3 : ev.off + 2, parseInt(e.target.value, 10)); onChange() }}
                        style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                      >
                        {Array.from({ length: isGen1 ? 190 : 252 }, (_, k) => k + 1).map((sid) => (
                          <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <table className="grid">
            <thead>
              <tr>
                <th>#</th>
                <th>等级</th>
                <th>学会的招式</th>
                <th>效果</th>
              </tr>
            </thead>
            <tbody>
              {entry.learns.map((l, i) => {
                const mid = l.move
                const effOff = profile.moves ? profile.moves.offset + (mid - (profile.moves.firstId ?? 0)) * profile.moves.entrySize + 1 : null
                const effId = effOff !== null ? rom.readU8(effOff) : 0
                const eff = EFFECTS.find((x) => x.id === effId)
                const effZh = eff && eff.zh !== eff.name ? eff.zh : '普通攻击'
                const mvType = profile.moves ? rom.readU8(profile.moves.offset + (mid - (profile.moves.firstId ?? 0)) * profile.moves.entrySize + 3) : 0
                return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <input
                      defaultValue={l.level}
                      key={`lv${i}-${l.level}`}
                      style={{ width: 48 }}
                      onBlur={(e) => change(l.levelOff, e.target.value, 100)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    />
                  </td>
                  <td className="name">
                    <span className="pf-icon-cell">
                    <TypeBadge id={mvType} label={TYPES_GEN12[mvType] ?? '?'} />
                    <select
                      value={l.move}
                      onChange={(e) => change(l.moveOff, e.target.value, 254)}
                      style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                    >
                      {MOVE_OPTIONS.map((mid2) => (
                        <option key={mid2} value={mid2}>{mid2} {moveName(mid2)}</option>
                      ))}
                    </select>
                    </span>
                  </td>
                  <td style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 12.5 }}>
                    {eff && eff.zh !== eff.name ? eff.zh : '普通攻击'}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
          <p style={{ color: 'var(--muted)', marginTop: 10 }}>
            ⚠ 修改等级/招式为原地编辑，不能增删条目数量（增删需要搬移后续数据，后续版本支持）。游戏内升级即按此表学习。
          </p>
        </>
      )}
      {!entry && table && (
        <div className="empty"><h2>解析失败</h2><p>该条目无法按标准结构解析（重度魔改 ROM）。</p></div>
      )}
      {!table && (
        <div className="empty"><h2>未定位升级技能表</h2><p>该 ROM 的进化/学习表结构无法识别。</p></div>
      )}
    </>
  )
}
