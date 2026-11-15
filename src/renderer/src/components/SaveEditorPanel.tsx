import { useState } from 'react'
import type { OpenedRom } from '../App'
import {
  openSav, fixSavChecksum, sortAllBoxes, sortBoxByDex, readBox, BOX_COUNT,
  writeStatExp, setPokerus, setShiny,
  getPlayerInfo, setPlayerName, setMoney, setCoins, getCoins, getBadges, toggleBadge, readBag, writeBagItem,
  BADGE_NAMES, type SavInfo
} from '@core/saveedit'
import { speciesName, moveName, speciesName as spName } from '@core/names'
import PFIcon from './PFIcon'
import gen2Zh from '@core/gen2-items-zh.json'
import { GenderBadge } from './badges'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const ITEM_ZH = gen2Zh as Record<number, string>
const MOVE_OPTIONS = Array.from({ length: 254 }, (_, i) => i + 1)
const SPECIES_OPTIONS = Array.from({ length: 252 }, (_, i) => i + 1)

function BadgeChip({ name, on, color, onClick }: { name: string; on: boolean; color: string; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer',
      padding: '6px 10px', borderRadius: 8, minWidth: 64,
      background: on ? 'rgba(247,201,72,0.18)' : 'var(--bg)',
      border: `1px solid ${on ? color : 'var(--border)'}`,
      opacity: on ? 1 : 0.45
    }}>
      <span style={{ fontSize: 20, filter: on ? 'none' : 'grayscale(1)' }}>🏅</span>
      <span style={{ fontSize: 11 }}>{name}</span>
    </span>
  )
}

export default function SaveEditorPanel({ opened, onChange }: Props) {
  const [savPath, setSavPath] = useState<string | null>(null)
  const [info, setInfo] = useState<SavInfo | null>(null)
  const [boxTick, setBoxTick] = useState(0)

  async function openSavFile() {
    const result = await window.pokeforge.openRom()
    if (!result) return
    const rom = { data: Buffer.from(result.data), platform: 'gb' } as OpenedRom['rom']
    const info = openSav(rom)
    setSavPath(result.filePath)
    setInfo(info)
    ;(window as unknown as { __pfSavRom?: OpenedRom['rom'] }).__pfSavRom = rom
  }

  const savRom = (window as unknown as { __pfSavRom?: OpenedRom['rom'] }).__pfSavRom
  function saveSav() {
    if (!savPath || !savRom) return
    fixSavChecksum(savRom)
    void window.pokeforge.saveRom(savPath, savRom.data.buffer as ArrayBuffer)
    alert('存档已保存（校验和已重算）。建议先在模拟器里读档确认再继续游玩。')
  }

  function change(monOff: number, idx: number, key: 'species' | 'item' | `move${number}`, raw: string) {
    if (!savRom) return
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 1 || v > 255) return
    if (key === 'species') savRom.writeU8(monOff, v)
    else if (key === 'item') savRom.writeU8(monOff + 1, v)
    else savRom.writeU8(monOff + 2 + idx, v)
    const info2 = openSav(savRom)
    setInfo(info2)
  }

  function sortBox(k: number) {
    if (!savRom) return
    sortBoxByDex(savRom, k)
    setBoxTick((t) => t + 1)
  }

  function sortAll() {
    if (!savRom) return
    const n = sortAllBoxes(savRom)
    setBoxTick((t) => t + 1)
    alert(`已按图鉴编号整理 ${n} 个非空盒子`)
  }

  if (!info?.ok) {
    return (
      <div style={{ maxWidth: 760 }}>
        <div className="searchbar">
          <button onClick={openSavFile}>打开 .sav 存档文件</button>
          {savPath && <span className="badge">{savPath}</span>}
        </div>
        {info && !info.ok && <div style={{ color: 'var(--danger)', marginTop: 10 }}>{info.reason}</div>}
        <p style={{ color: 'var(--muted)', marginTop: 10 }}>
          选择你模拟器目录下的 .sav 存档（通常与 ROM 同名）。支持金/银/水晶及其改版。
          注意：需至少游玩并保存过一次（空存档无可编辑数据）。
        </p>
      </div>
    )
  }

  if (!savRom) return null
  const pi = getPlayerInfo(savRom)
  const badges = getBadges(savRom)
  const bag = readBag(savRom)

  return (
    <div>
      <div className="searchbar">
        <button onClick={openSavFile}>打开其他存档</button>
        <span className="badge">队伍 {info.partyCount} 只</span>
        <button onClick={saveSav}>💾 保存存档</button>
      </div>

      {/* 人物信息卡 */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>👤 人物信息卡</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13 }}>玩家名：</span>
          <input defaultValue={pi.name} key={'pname-' + pi.name}
            style={{ width: 140, background: 'var(--bg-input)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', borderRadius: 4, padding: '2px 6px', font: 'inherit' }}
            onBlur={(e) => { if (!setPlayerName(savRom, e.target.value)) alert('仅支持英文字母/数字/空格'); onChange() }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>（仅支持英文字母/数字/空格）</span>
          <span style={{ fontSize: 13 }}>金钱：</span>
          <input defaultValue={pi.money} key={'money-' + pi.money}
            style={{ width: 100, background: 'var(--bg-input)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', borderRadius: 4, padding: '2px 6px', font: 'inherit' }}
            onBlur={(e) => { setMoney(savRom, parseInt(e.target.value, 10) || 0); onChange() }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>（上限 999999）</span>
          <span style={{ fontSize: 13 }}>代币：</span>
          <input defaultValue={getCoins(savRom)} key={'coins-' + getCoins(savRom)}
            style={{ width: 80, background: 'var(--bg-input)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', borderRadius: 4, padding: '2px 6px', font: 'inherit' }}
            onBlur={(e) => { setCoins(savRom, parseInt(e.target.value, 10) || 0); onChange() }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>（游戏中心用，上限 9999）</span>
        </div>
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: 'var(--accent)', fontSize: 13 }}>🏅 徽章（点击点亮/熄灭）</strong>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {BADGE_NAMES.johto.map((name, i) => (
            <BadgeChip key={'j' + i} name={name} on={badges.johto[i]} color="#f7c948" onClick={() => { toggleBadge(savRom, 'johto', i); onChange() }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BADGE_NAMES.kanto.map((name, i) => (
            <BadgeChip key={'k' + i} name={name} on={badges.kanto[i]} color="#9ece6a" onClick={() => { toggleBadge(savRom, 'kanto', i); onChange() }} />
          ))}
        </div>
      </div>

      {/* 背包 */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>🎒 背包</div>
        {bag.map((pocket, pi2) => (
          <div key={pi2} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, margin: '4px 0', fontSize: 12.5 }}>{pocket.name}（{pocket.slots.length} 种）</div>
            {pocket.slots.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>（空）</div>
            ) : (
              <table className="grid">
                <thead><tr><th>#</th><th>道具</th><th>数量</th></tr></thead>
                <tbody>
                  {pocket.slots.map((slot, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <select value={slot.item} onChange={(e) => writeBagItem(savRom, slot.itemOff, slot.qtyOff, parseInt(e.target.value, 10), slot.qty)}
                          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}>
                          <option value={0}>（空位）</option>
                          {Array.from({ length: 95 }, (_, k) => k + 1).map((iid) => (
                            <option key={iid} value={iid}>{iid} {ITEM_ZH[iid] ?? '?'}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input defaultValue={slot.qty} key={'q' + pi2 + '-' + i + '-' + slot.qty} style={{ width: 48 }}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10)
                            if (!Number.isNaN(v) && v >= 1 && v <= 99) writeBagItem(savRom, slot.itemOff, slot.qtyOff, slot.item, v)
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {/* PC 盒子 */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div className="searchbar" style={{ marginBottom: 8 }}>
          <strong style={{ color: 'var(--accent)' }}>🗄 PC 盒子</strong>
          <button onClick={() => { if (window.confirm('按图鉴编号排序所有盒子？')) sortAll() }}>
            一键整理全部盒子
          </button>
        </div>
        <table className="grid">
          <thead>
            <tr><th>盒子</th><th>内容（图鉴 · 等级）</th><th></th></tr>
          </thead>
          <tbody>
            {Array.from({ length: BOX_COUNT }, (_, k) => k + 1).map((k) => {
              const mons = readBox(savRom, k)
              return (
                <tr key={k}>
                  <td>盒子 {k}</td>
                  <td style={{ textAlign: 'left' }}>
                    {mons.length === 0
                      ? <span style={{ color: 'var(--text-muted)' }}>（空）</span>
                      : mons.map((m, i) => (
                        <span key={i} style={{ marginRight: 10 }}>
                          {m.species >= 0xfd ? '🥚' : spName(m.species)}·Lv{m.level}
                        </span>
                      ))}
                  </td>
                  <td>
                    {mons.length > 1 && (
                      <button className="secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => sortBox(k)}>排序</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 队伍宝可梦 */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>🐾 队伍宝可梦（{info.partyCount} 只）</div>
        <table className="grid">
          <thead>
            <tr>
              <th>#</th><th>宝可梦</th><th>携带道具</th><th>招式1</th><th>招式2</th><th>招式3</th><th>招式4</th><th>等级</th><th>HP</th>
            </tr>
          </thead>
          <tbody>
            {info.mons.map((mon, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><span className="pf-icon-cell"><PFIcon kind="pokemon" id={mon.species} size={40} />
                  <GenderBadge rom={opened.rom} baseStats={opened.profile.baseStats} species={mon.species} />
                  <select value={mon.species} onChange={(e) => change(mon.off, i, 'species', e.target.value)}
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}>
                    {SPECIES_OPTIONS.map((sid) => (
                      <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                    ))}
                  </select>
                </span>
                </td>
                <td>
                  <select value={mon.item} onChange={(e) => change(mon.off, i, 'item', e.target.value)}
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}>
                    <option value={0}>无</option>
                    {Array.from({ length: 95 }, (_, k) => k + 1).map((iid) => (
                      <option key={iid} value={iid}>{iid} {ITEM_ZH[iid] ?? '?'}</option>
                    ))}
                  </select>
                </td>
                {mon.moves.map((mv, k) => (
                  <td key={k}>
                    <select value={mv} onChange={(e) => change(mon.off, i, `move${k}` as 'move0', e.target.value)}
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}>
                      <option value={0}>无</option>
                      {MOVE_OPTIONS.map((mid) => (
                        <option key={mid} value={mid}>{mid} {moveName(mid)}</option>
                      ))}
                    </select>
                  </td>
                ))}
                <td>{mon.level}</td>
                <td>{mon.curHp}/{mon.maxHp}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 个体值 / 努力值 / 病毒 / 闪光 */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 12.5, marginBottom: 8 }}>🧬 个体值（DV）· 基础努力值（Stat Exp）· 病毒 · 闪光</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {info.mons.map((mon, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', minWidth: 300, background: 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <PFIcon kind="pokemon" id={mon.species} size={28} />
                  <strong style={{ fontSize: 12.5 }}>{speciesName(mon.species)}</strong>
                  {mon.shiny && <span className="shiny-star">★ 闪光</span>}
                  {mon.pokerus > 0 && <span style={{ fontSize: 11, color: '#c42b1c' }}>🦠 病毒</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '3px 8px', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>个体值（0-15）</span>
                  {(['atk', 'def', 'spd', 'spc'] as const).map((k) => (
                    <input key={k} type="number" min={0} max={15} defaultValue={mon.dvs[k]}
                      style={{ width: 44, height: 24, fontSize: 12 }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10)
                        if (Number.isNaN(v) || v < 0 || v > 15) return
                        const idx = { atk: 0, def: 1, spd: 2, spc: 3 }[k]
                        const cur = mon.dvs
                        cur[k] = v
                        const b0 = (cur.atk << 4) | cur.def
                        const b1 = (cur.spd << 4) | cur.spc
                        savRom.writeU8(mon.off + 21, b0)
                        savRom.writeU8(mon.off + 22, b1)
                        setInfo(openSav(savRom))
                      }} />
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '3px 8px', alignItems: 'center', fontSize: 12, marginTop: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>努力值（0-65535）</span>
                  {(['hp', 'atk', 'def', 'spd', 'spc'] as const).map((k, idx) => (
                    <input key={k} type="number" min={0} max={65535} defaultValue={mon.statExp[k]}
                      style={{ width: 60, height: 24, fontSize: 12 }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10)
                        if (Number.isNaN(v) || v < 0 || v > 65535) return
                        writeStatExp(savRom, mon.off, idx, v)
                        setInfo(openSav(savRom))
                      }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="checkbox" checked={mon.pokerus > 0}
                      onChange={(e) => { setPokerus(savRom, mon.off, e.target.checked); setInfo(openSav(savRom)) }} />
                    宝可病毒（努力值×2）
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="checkbox" checked={mon.shiny}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setShiny(savRom, mon.off, true)
                        } else {
                          savRom.writeU8(mon.off + 21, 0x99); savRom.writeU8(mon.off + 22, 0x99)
                        }
                        setInfo(openSav(savRom))
                      }} />
                    闪光
                  </label>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 12 }}>
            💡 个体值 10/10/10/10 = 闪光（金银判定）；改后能力值在升级或存取 PC 时重算。努力值可用营养饮品（ HP 增强 等）在游戏内继续提升。
          </p>
        </div>

        <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 12 }}>
          ⚠ 改种族/招式后，六项能力值不会立即重算——进游戏升级或放入 PC 再取出即可刷新。
        </p>
      </div>
    </div>
  )
}
