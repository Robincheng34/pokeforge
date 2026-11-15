import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import {
  resolveTrainerGroups, CLASS_NAMES_BY_NUM, STORY_ORDER_NUMS, readTrainerGroup, writeTrainerField, convertTrainerToMoves, TRAINERTYPE_NAMES,
  type TrainerGroupRef, type TrainerEntry, type TrainerMon
} from '@core/trainers'
import { resolveEvosTable, readEvosEntryFor } from '@core/evos'
import { findGen1Trainers, readGen1Class, writeGen1MonLevel, writeGen1MonSpecies, CLASS_ZH_GEN1, type Gen1Trainer } from '@core/trainers-gen1'
import { speciesName, moveName } from '@core/names'
import PFIcon, { PersonAvatar } from './PFIcon'
import { GenderBadge } from './badges'
import gen2Zh from '@core/gen2-items-zh.json'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const ITEM_ZH = gen2Zh as Record<number, string>
const ITEMS = Array.from({ length: 95 }, (_, i) => i + 1)
const MOVE_OPTIONS = Array.from({ length: 254 }, (_, i) => i + 1) // Gen2 招式 id 1-254

export function itemName(id: number): string {
  if (id === 0) return '无'
  return `#${id} ${ITEM_ZH[id] ?? '?'}`
}

/** 单个训练家的队伍表格 */
function PartyTable({ entry, rom, onChange, bs }: { entry: TrainerEntry; rom: OpenedRom['rom']; onChange: () => void; bs: OpenedRom['profile']['baseStats'] }) {
  function change(mon: TrainerMon, field: 'level' | 'species' | 'item' | 'move', raw: string, moveIndex?: number) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 0 || v > 255) return
    try {
      writeTrainerField(rom, mon, field, v, moveIndex)
      onChange()
    } catch { /* 类型不支持 */ }
  }
  return (
    <table className="grid">
      <thead>
        <tr>
          <th>#</th>
          <th>等级</th>
          <th>宝可梦</th>
          {entry.type >= 2 && <th>持有道具</th>}
          {(entry.type === 1 || entry.type === 3) && (
            <><th>招式1</th><th>招式2</th><th>招式3</th><th>招式4</th></>
          )}
        </tr>
      </thead>
      <tbody>
        {entry.mons.map((mon, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>
              <input defaultValue={mon.level} key={`lv${i}-${mon.level}`} style={{ width: 'auto' }}
                onBlur={(e) => change(mon, 'level', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
            </td>
            <td className="name"><span className="pf-icon-cell"><PFIcon kind="pokemon" id={mon.species} size={40} />
              <select
                value={mon.species}
                onChange={(e) => change(mon, 'species', e.target.value)}
                style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
              >
                {Array.from({ length: 252 }, (_, k) => k + 1).map((id) => (
                  <option key={id} value={id}>#{id} {speciesName(id)}</option>
                ))}
              </select>
              <GenderBadge rom={rom} baseStats={bs} species={mon.species} /></span>
            </td>
            {entry.type >= 2 && (
              <td>
                <select
                  value={mon.item ?? 0}
                  onChange={(e) => change(mon, 'item', e.target.value)}
                  style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                >
                  <option value={0}>无</option>
                  {ITEMS.map((id) => (
                    <option key={id} value={id}>{itemName(id)}</option>
                  ))}
                </select>
              </td>
            )}
            {(entry.type === 1 || entry.type === 3) && mon.moves!.map((mv, k) => (
              <td key={k}>
                <select
                  value={mv}
                  onChange={(e) => change(mon, 'move', e.target.value, k)}
                  style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                >
                  <option value={0}>无</option>
                  {MOVE_OPTIONS.map((mid) => (
                    <option key={mid} value={mid}>{mid} {moveName(mid)}</option>
                  ))}
                </select>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function TrainerEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [groupLabel, setGroupLabel] = useState('')
  const [filter, setFilter] = useState('')
  if (profile.gen === 1) {
    return <TrainerEditorGen1 opened={opened} onChange={onChange} />
  }

  const evosTable = useMemo(() => resolveEvosTable(rom), [opened])

  if (profile.gen !== 2) {
    return (
      <div className="empty">
        <h2>训练家队伍编辑器</h2>
        <p>当前版本仅支持 Gen 2（金/银/水晶）。</p>
      </div>
    )
  }

  // 打开 ROM 时解析一次指针表（金/银/水晶偏移不同，动态定位），并按游戏剧情进度排序
  const resolved = useMemo(() => {
    const groups = resolveTrainerGroups(rom)
    const order = (num: number) => {
      const i = STORY_ORDER_NUMS.indexOf(num)
      return i === -1 ? 1000 + num : i
    }
    return [...groups].sort((a, b) => order(a.num) - order(b.num))
  }, [opened])
  const filtered = filter.trim()
    ? resolved.filter((g) => (CLASS_NAMES_BY_NUM[g.num] ?? '').includes(filter.trim()))
    : resolved
  const current = (resolved.find((g) => String(g.num) === groupLabel) ?? resolved[0]) as TrainerGroupRef & { num: number }
  // 分组边界：地址紧随其后的下一个分组，防止解析越界
  const groupEnd = useMemo(() => {
    const sorted = [...resolved].sort((a, b) => a.bank * 0x10000 + a.addr - (b.bank * 0x10000 + b.addr))
    const idx = sorted.findIndex((g) => g.num === current.num)
    const next = sorted[idx + 1]
    return next && next.bank === current.bank ? next.bank * 0x4000 + (next.addr - 0x4000) : rom.size
  }, [current.num, resolved, rom.size])
  const groupData = useMemo(() => readTrainerGroup(rom, current, 40, groupEnd), [current, groupEnd, rom.modifiedCount])

  return (
    <>
      <div className="searchbar">
        <select
          value={String(current.num)}
          onChange={(e) => setGroupLabel(e.target.value)}
          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}
        >
          {resolved.map((g) => (
            <option key={g.num} value={String(g.num)}>{CLASS_NAMES_BY_NUM[g.num] ?? '组'+g.num}</option>
          ))}
        </select>
        <input placeholder="搜索人物（如：道馆 / 火箭队 / 精英）" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="badge">
          {groupData.trainers.length} 个训练家 · 数据 0x{(current.bank * 0x4000 + (current.addr - 0x4000)).toString(16)}
        </span>
      </div>

      {groupData.trainers.length === 0 ? (
        <div className="empty">
          <h2>解析失败</h2>
          <p>该分组的队伍数据无法按标准结构解析（可能是重度魔改 ROM）。</p>
        </div>
      ) : (
        groupData.trainers.map((entry, ti) => (
          <div key={ti} style={{ marginBottom: 18 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, margin: '6px 0 4px' }}>
              {CLASS_NAMES_BY_NUM[current.num] ?? '组'+current.num} · 第 {ti + 1} 人
              <span className="badge" style={{ marginLeft: 8 }}>{TRAINERTYPE_NAMES[entry.type] ?? '未知类型'}</span>
              <span className="badge" style={{ marginLeft: 4 }}>
                名字：{Array.from({ length: entry.nameLength - 1 }, (_, k) => rom.readU8(entry.nameOffset + k).toString(16).padStart(2, '0')).join(' ')}（汉化编码）
              </span>
              {entry.type === 0 && (
                <button className="secondary" style={{ marginLeft: 8, height: 22, padding: '0 8px', fontSize: 11 }}
                  onClick={() => {
                    const gref = resolved.find((g) => g.num === current.num)
                    const learnCache = new Map<number, Array<{ level: number; move: number }>>()
                    const learnsetOf = (sp: number) => {
                      let l = learnCache.get(sp)
                      if (!l) { l = evosTable ? readEvosEntryFor(rom, evosTable, sp)?.learns ?? [] : []; learnCache.set(sp, l) }
                      return l
                    }
                    if (gref) convertTrainerToMoves(rom, gref, ti, groupEnd, learnsetOf)
                    onChange()
                  }}>
                  启用自定义技能（转为带招式格式）
                </button>
              )}
            </div>
            <PartyTable entry={entry} rom={rom} onChange={onChange} bs={profile.baseStats} />
          </div>
        ))
      )}
    </>
  )
}

export function TrainerEditorGen1({ opened, onChange }: { opened: OpenedRom; onChange: () => void }) {
  const { rom } = opened
    const td = useMemo(() => findGen1Trainers(rom), [opened])
    const [, tick] = useState(0)
    const [cls, setCls] = useState(1)
    if (!td) return <div className="empty"><h2>人物队伍</h2><p>未定位到训练家数据表（该 ROM 结构异常）。</p></div>
    const trainers = readGen1Class(rom, td, cls) as Gen1Trainer[]
    const g1Change = (mon: { lvOff: number; spOff: number }, field: 'level' | 'species', raw: string) => {
      const v = parseInt(raw, 10)
      if (Number.isNaN(v)) return
      if (field === 'level' && v >= 1 && v <= 100) writeGen1MonLevel(rom, mon as never, v)
      if (field === 'species' && v >= 1 && v <= 151) writeGen1MonSpecies(rom, mon as never, v)
      onChange(); tick((x) => x + 1)
    }
    return (
      <>
        <div className="searchbar">
          <select value={cls} onChange={(e2) => setCls(parseInt(e2.target.value, 10))}
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}>
            {CLASS_ZH_GEN1.map((nm, i) => (i > 0 ? <option key={i} value={i}>{nm}</option> : null))}
          </select>
          <span className="badge">{trainers.length} 个训练家 · 数据表 @ 0x{td.tableOff.toString(16)}</span>
        </div>
        {trainers.map((tr, ti) => (
          <div key={ti} style={{ marginBottom: 16 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, margin: '6px 0 4px' }}>
              {CLASS_ZH_GEN1[cls]} · 第 {ti + 1} 人
              <span className="badge" style={{ marginLeft: 8 }}>{tr.mons.length} 只宝可梦</span>
            </div>
            <table className="grid">
              <thead><tr><th>#</th><th>等级</th><th>宝可梦</th></tr></thead>
              <tbody>
                {tr.mons.map((mon, mi) => (
                  <tr key={mi}>
                    <td>{mi + 1}</td>
                    <td>
                      <input defaultValue={mon.level} key={'g1lv' + ti + '-' + mi + '-' + mon.level} style={{ width: 'auto' }}
                        onBlur={(e2) => g1Change(mon, 'level', e2.target.value)}
                        onKeyDown={(e2) => { if (e2.key === 'Enter') (e2.target as HTMLInputElement).blur() }} />
                    </td>
                    <td className="name"><span className="pf-icon-cell"><PFIcon kind="pokemon" id={mon.species} size={40} />
                      <select value={mon.species} key={'g1sp' + ti + '-' + mi + '-' + mon.species}
                        onChange={(e2) => g1Change(mon, 'species', e2.target.value)}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}>
                        {Array.from({ length: 151 }, (_, k) => k + 1).map((sid) => (
                          <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                        ))}
                      </select></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <p style={{ color: 'var(--muted)', fontSize: 12 }}>
          Gen1 队伍 = 等级+物种列表（部分训练家全队共用一个等级）。改等级会作用于共用等级的整块队伍。
        </p>
      </>
    )
}

