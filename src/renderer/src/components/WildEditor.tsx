import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { getWildTables, readGrassWildTable, writeWildSlot, gbTableFileOffset, wildStoryIndex, TIMES, SLOTS_PER_TIME, type WildTableRef } from '@core/wild'
import { mapName } from '@core/mapnames'
import { writeSpeciesField } from '@core/profiles'
import { resolveEvosTable, readEvosEntryFor } from '@core/evos'
import { defaultMovesAt } from '@core/trainers'
import { findWildDvSite, setWildShiny, readWildShiny } from '@core/givepoke-patch'
import { findWildPointersGen1, readGen1Wild, listGen1WildMaps, writeGen1WildLevel, writeGen1WildSpecies, writeGen1WildRate, GEN1_WILD_MAP_ZH, type Gen1WildSlot } from '@core/wild-gen1'

import TimePixelIcon from './TimePixelIcon'
import PFIcon from './PFIcon'
import { GenderBadge } from './badges'
import { speciesName, moveName } from '@core/names'
import gen2Zh from '@core/gen2-items-zh.json'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const SPECIES_OPTIONS = Array.from({ length: 252 }, (_, i) => i + 1) // Gen2: 1-252
const ITEM_ZH = gen2Zh as Record<number, string>
const ITEMS = Array.from({ length: 95 }, (_, i) => i + 1)

export default function WildEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [selected, setSelected] = useState<string>('')
  const [filter, setFilter] = useState('')
  const [, forceTick] = useState(0)

  if (profile.gen !== 2 && profile.gen !== 1) {
    return (
      <div className="empty">
        <h2>野生遭遇编辑器</h2>
        <p>当前版本仅支持 Gen 1（红绿蓝黄）与 Gen 2（金/银/水晶）。</p>
      </div>
    )
  }

  const isGen1 = profile.gen === 1
  if (isGen1) {
    const wt = useMemo(() => findWildPointersGen1(rom), [opened])
    const [, tick] = useState(0)
    const maps = useMemo(() => (wt ? listGen1WildMaps(rom, wt) : []), [wt])
    const [selId, setSelId] = useState(12)
    if (!wt) return <div className="empty"><h2>野生遭遇</h2><p>未定位到野生数据表（该 ROM 结构异常）。</p></div>
    const entry = readGen1Wild(rom, wt, selId)
    const g1Slot = (slot: Gen1WildSlot, label: string) => (
      <tr key={label + slot.lvOff}>
        <td>{label}</td>
        <td className="name"><span className="pf-icon-cell"><PFIcon kind="pokemon" id={slot.species} size={36} />
          <select value={slot.species} key={"sp" + slot.lvOff + "-" + slot.species}
            onChange={(e2) => { writeGen1WildSpecies(rom, slot, parseInt(e2.target.value, 10)); onChange(); tick((t) => t + 1) }}
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}>
            {Array.from({ length: 151 }, (_, k) => k + 1).map((sid) => (
              <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
            ))}
          </select></span></td>
        <td>
          <input defaultValue={slot.level} key={'lv' + slot.lvOff + '-' + slot.level} style={{ width: 'auto' }}
            onBlur={(e2) => { const v = parseInt(e2.target.value, 10); if (!Number.isNaN(v) && v >= 1 && v <= 100) { writeGen1WildLevel(rom, slot, v); onChange() } }}
            onKeyDown={(e2) => { if (e2.key === 'Enter') (e2.target as HTMLInputElement).blur() }} />
        </td>
      </tr>
    )
    return (
      <div style={{ maxWidth: 900 }}>
        <div className="searchbar">
          <select value={selId} onChange={(e2) => setSelId(parseInt(e2.target.value, 10))}
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}>
            {maps.map((mid) => (
              <option key={mid} value={mid}>{GEN1_WILD_MAP_ZH[mid] ?? "地图 " + mid}</option>
            ))}
          </select>
          <span className="badge">{maps.length} 张遭遇表 · 表 @ 0x{wt.tableOff.toString(16)}</span>
        </div>
        {entry && (
          <table className="grid">
            <thead><tr><th>区域</th><th>宝可梦</th><th>等级</th></tr></thead>
            <tbody>
              <tr><td className="name">草丛率</td><td colSpan={2}>
                <input defaultValue={entry.grassRate} key={"gr" + entry.grassRate} style={{ width: 60 }}
                  onBlur={(e2) => { const v = parseInt(e2.target.value, 10); if (!Number.isNaN(v) && v >= 0 && v <= 255) { writeGen1WildRate(rom, entry.grassRateOff, v); onChange() } }}
                  onKeyDown={(e2) => { if (e2.key === 'Enter') (e2.target as HTMLInputElement).blur() }} />
              </td></tr>
              {entry.grass.map((s2, k) => g1Slot(s2, "草丛 " + (k + 1)))}
              <tr><td className="name">水面率</td><td colSpan={2}>
                <input defaultValue={entry.waterRate} key={"wr" + entry.waterRate} style={{ width: 60 }}
                  onBlur={(e2) => { const v = parseInt(e2.target.value, 10); if (!Number.isNaN(v) && v >= 0 && v <= 255) { writeGen1WildRate(rom, entry.waterRateOff, v); onChange() } }}
                  onKeyDown={(e2) => { if (e2.key === 'Enter') (e2.target as HTMLInputElement).blur() }} />
              </td></tr>
              {entry.water.map((s2, k) => g1Slot(s2, "水面 " + (k + 1)))}
            </tbody>
          </table>
        )}
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
          Gen1 每图 10 格草丛 + 10 格水面遭遇（率 0 = 该区域无遇敌）。物种写入为 Gen1 内部编号（自动转换）。
        </p>
      </div>
    )
  }
  const tables = useMemo(
    () => [...getWildTables(rom).grass].sort((a, b) => wildStoryIndex(a.label) - wildStoryIndex(b.label)),
    [opened]
  )
  const filtered = useMemo(() => {
    if (!filter.trim()) return tables
    const q = filter.trim().toLowerCase()
    return tables.filter((t: WildTableRef) => t.label.toLowerCase().includes(q) || mapName(t.label).includes(filter.trim()))
  }, [filter])

  const current = tables.find((t) => t.label === selected) ?? tables[0]
  const data = useMemo(() => (current ? readGrassWildTable(rom, current) : null), [current, rom.modifiedCount])

  // 升级学习表（用于推算野生宝可梦该等级会学的招式）
  const evosTable = useMemo(() => resolveEvosTable(rom), [opened])
  const learnCache = useMemo(() => new Map<number, Array<{ level: number; move: number }>>(), [opened])
  function learnsetOf(sp: number) {
    let l = learnCache.get(sp)
    if (!l) {
      l = evosTable ? readEvosEntryFor(rom, evosTable, sp)?.learns ?? [] : []
      learnCache.set(sp, l)
    }
    return l
  }
  const wildShinySite = useMemo(() => findWildDvSite(rom), [opened])

  function change(slotIndex: number, field: 'level' | 'species', raw: string) {
    if (!data) return
    if (field === 'level') {
      const v = parseInt(raw, 10)
      if (Number.isNaN(v) || v < 1 || v > 100) return
      writeWildSlot(rom, data, slotIndex, 'level', v)
    } else {
      const v = parseInt(raw, 10)
      if (Number.isNaN(v) || v < 1 || v > 255) return
      writeWildSlot(rom, data, slotIndex, 'species', v)
    }
    onChange()
  }

  /** 野生携带道具：金银按种族的 BaseStats item1(50%)/item2(5%) 判定，改的是全图鉴条目 */
  function changeHeldItem(species: number, slot: 1 | 2, raw: string) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 0 || v > 255) return
    writeSpeciesField(rom, profile.baseStats, species, slot === 1 ? 'item1' : 'item2', v)
    onChange()
  }

  function SlotRow({ si, time, isFirst }: { si: number; time: string; isFirst?: boolean }) {
    const slot = data!.slots[si]
    const moves = defaultMovesAt(learnsetOf(slot.species), slot.level)
    return (
      <tr key={time + '-' + si}>
        {isFirst && (
          <td rowSpan={SLOTS_PER_TIME} className="name" style={{ width: 88, minWidth: 88 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <TimePixelIcon time={time} size={30} />
              <span style={{ fontWeight: 600 }}>{time}</span>
            </div>
          </td>
        )}
        <td>{si + 1}</td>
        <td><span className="pf-icon-cell"><PFIcon kind="pokemon" id={slot.species} size={40} />
          <select
            value={slot.species}
            onChange={(e) => change(si, 'species', e.target.value)}
            style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
          >
            {SPECIES_OPTIONS.map((id) => (
              <option key={id} value={id}>#{id} {speciesName(id)}</option>
            ))}
          </select>
            <GenderBadge rom={rom} baseStats={profile.baseStats} species={slot.species} />
          </span>
        </td>
        <td>
          <input
            defaultValue={slot.level}
            key={`lv-${si}-${slot.level}`}
            style={{ width: 'auto' }}
            onBlur={(e) => change(si, 'level', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>50%</span>
            <select
              value={readSpeciesItem(slot.species, 1)}
              key={'i1-' + si + '-' + slot.species + '-' + readSpeciesItem(slot.species, 1)}
              onChange={(e) => changeHeldItem(slot.species, 1, e.target.value)}
              style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
            >
              <option value={0}>无</option>
              {ITEMS.map((iid) => (
                <option key={iid} value={iid}>{ITEM_ZH[iid] ?? '#' + iid}</option>
              ))}
            </select>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>5%</span>
            <select
              value={readSpeciesItem(slot.species, 2)}
              key={'i2-' + si + '-' + slot.species + '-' + readSpeciesItem(slot.species, 2)}
              onChange={(e) => changeHeldItem(slot.species, 2, e.target.value)}
              style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
            >
              <option value={0}>无</option>
              {ITEMS.map((iid) => (
                <option key={iid} value={iid}>{ITEM_ZH[iid] ?? '#' + iid}</option>
              ))}
            </select>
          </div>
        </td>
        <td style={{ color: 'var(--text-secondary)', fontSize: 12, textAlign: 'left' }}>
          {moves.filter((m) => m > 0).map((m) => moveName(m)).join(' / ') || '—'}
        </td>
      </tr>
    )
  }

  /** 读种族的 item1/item2（BaseStats 表，受全图鉴编辑影响，直接读字节） */
  function readSpeciesItem(species: number, slot: 1 | 2): number {
    const bs = profile.baseStats
    const off = bs.offset + (species - (bs.firstId ?? 0)) * bs.entrySize + (slot === 1 ? 11 : 12) // 与 writeSpeciesField 的 firstId??0 一致，此前??1 读错条目（尼多兰的毒针）
    return rom.readU8(off)
  }

  return (
    <>
      <div className="searchbar">
        <select
          value={current?.label ?? ''}
          onChange={(e) => setSelected(e.target.value)}
          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}
        >
          {tables.map((t) => (
            <option key={t.label} value={t.label}>{mapName(t.label)}</option>
          ))}
        </select>
        <input placeholder="过滤地点（如：塔 / 道路 / 洞）" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {data && (
          <span className="badge">
            {mapName(current!.label)}（{current!.label}）· 0x{gbTableFileOffset(current!).toString(16)} · 共 {tables.length} 张草丛表
            {getWildTables(rom).delta !== 0 ? ` · 检测到数据搬移 +0x${getWildTables(rom).delta.toString(16)}` : ''}
          </span>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: wildShinySite ? 'pointer' : 'not-allowed', fontSize: 13, marginLeft: 4 }}>
          <input type="checkbox" disabled={!wildShinySite} checked={wildShinySite ? readWildShiny(rom) : false}
            onChange={(e) => { setWildShiny(rom, e.target.checked); onChange(); forceTick((t) => t + 1) }} />
          ★ 全部野生闪光{wildShinySite ? '' : '（引擎未定位）'}
        </label>
      </div>

      {data && (
        <table className="grid">
          <thead>
            <tr>
              <th>时段</th>
              <th>#</th>
              <th>宝可梦</th>
              <th>等级</th>
              <th>携带道具（全图鉴生效）</th>
              <th>该等级会学的招式</th>
            </tr>
          </thead>
          <tbody>
            {TIMES.map((time, tIdx) => (
              <>
                <SlotRow si={tIdx * SLOTS_PER_TIME} time={time} isFirst />
                {Array.from({ length: SLOTS_PER_TIME - 1 }, (_, k) => {
                  const si = tIdx * SLOTS_PER_TIME + k + 1
                  return <SlotRow key={time + '-' + si} si={si} time={time} />
                })}
              </>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
        💡 携带道具列改的是该种族的图鉴数据（金银野生 50%/5% 携带判定），同一物种全地图生效；招式由升级技能表按等级推算，可在「升级技能表」里修改。
        病毒在金银里不会出现在野生宝可梦身上，可在领取/捕捉后到「存档编辑」手动添加。
      </p>
    </>
  )
}
