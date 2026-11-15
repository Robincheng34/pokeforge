import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { findCornerPrizes, writePrizePrice, type CornerPrize } from '@core/gamecorner'
import { findPrizesGen1, writeGen1Price as writeG1PrizePrice, writeGen1PrizeSpecies, writeGen1PrizeLevel } from '@core/prizes-gen1'
import gen1Zh from '@core/gen1-items-zh.json'
import { openSav, setCoins, getCoins, fixSavChecksum } from '@core/saveedit'
import { speciesName } from '@core/names'
import PFIcon from './PFIcon'
import gen2Zh from '@core/gen2-items-zh.json'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const ITEM_ZH = gen2Zh as Record<number, string>
const SPECIES_OPTIONS = Array.from({ length: 252 }, (_, i) => i + 1)
const ITEMS = Array.from({ length: 250 }, (_, i) => i + 1)

function itemName(id: number): string {
  if (id >= 192 && id <= 241) return `招式机${String(id - 191).padStart(2, '0')}`
  if (id >= 242 && id <= 248) return `秘传机0${id - 241}`
  return ITEM_ZH[id] ?? `#${id}`
}

export default function GameCornerPanel({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [, tick] = useState(0)
  const [savState, setSavState] = useState<{ path: string; coins: number } | null>(null)

  const prizes = useMemo(() => findCornerPrizes(rom), [opened])

  async function openSavFile() {
    const result = await window.pokeforge.openRom()
    if (!result) return
    const romData = { data: Buffer.from(result.data), platform: 'gb' } as OpenedRom['rom']
    const info = openSav(romData)
    if (!info.ok) { alert('不是有效的金银水晶存档：' + (info.reason ?? '')); return }
    ;(window as unknown as { __pfSavRom?: OpenedRom['rom'] }).__pfSavRom = romData
    setSavState({ path: result.filePath, coins: getCoins(romData) })
  }

  function addCoins(amount: number) {
    const savRom = (window as unknown as { __pfSavRom?: OpenedRom['rom'] }).__pfSavRom
    if (!savRom) { void openSavFile(); return }
    const cur = getCoins(savRom)
    setCoins(savRom, Math.min(9999, cur + amount))
    fixSavChecksum(savRom)
    void window.pokeforge.saveRom(savState?.path ?? '', savRom.data.buffer as ArrayBuffer)
    setSavState({ path: savState?.path ?? '', coins: getCoins(savRom) })
    alert(`已加 ${amount} 代币并保存（上限 9999）。`)
  }

  function setPrize(p: CornerPrize, patch: Partial<CornerPrize> & { price?: number; species?: number; level?: number; item?: number }) {
    if (patch.price !== undefined) writePrizePrice(rom, p, patch.price)
    if (patch.species !== undefined && p.spOff !== undefined) rom.writeU8(p.spOff, patch.species)
    if (patch.level !== undefined && p.lvOff !== undefined) rom.writeU8(p.lvOff, patch.level)
    if (patch.item !== undefined && p.itemOff !== undefined) rom.writeU8(p.itemOff, patch.item)
    onChange()
    tick((t) => t + 1)
  }

  const isGen1 = profile.gen === 1
  if (isGen1) {
    const prizes1 = useMemo(() => findPrizesGen1(rom), [opened])
    const [, tick] = useState(0)
    const g1Zh = gen1Zh as Record<number, string>
    if (!prizes1) return <div className="empty"><h2>游戏中心</h2><p>未定位到奖品数据（该 ROM 结构异常）。</p></div>
    return (
      <div style={{ maxWidth: 860 }}>
        <div className="card">
          <div className="card-title">🎰 游戏中心奖品兑换（枯叶市游戏中心 · 兑奖台）</div>
          <table className="grid">
            <thead>
              <tr><th>奖品</th><th>当前</th><th>改为</th><th>价格（币）</th></tr>
            </thead>
            <tbody>
              {prizes1.mons.map((p2, i) => (
                <tr key={"m" + i}>
                  <td className="name" style={{ color: "var(--text-muted)" }}>宝可梦（{i < 3 ? "低奖组" : "高奖组"}）</td>
                  <td className="name"><span className="pf-icon-cell"><PFIcon kind="pokemon" id={p2.species ?? 0} size={36} />
                    <span className="pf-name-text">#{p2.species ?? 0} {speciesName(p2.species ?? 0)} · Lv{p2.level ?? 0}</span></span></td>
                  <td>
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <select value={p2.species ?? 0} key={"g1sp" + i + "-" + p2.species}
                        onChange={(e2) => { writeGen1PrizeSpecies(rom, p2.spOff ?? 0, parseInt(e2.target.value, 10)); onChange(); tick((t) => t + 1) }}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', flex: 1, minWidth: 130 }}>
                        {Array.from({ length: 151 }, (_, k) => k + 1).map((sid) => (
                          <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                        ))}
                      </select>
                      <input defaultValue={p2.level} key={"g1lv" + i + "-" + p2.level} style={{ width: 44 }}
                        onBlur={(e2) => { const v = parseInt(e2.target.value, 10); if (!Number.isNaN(v) && v >= 2 && v <= 100) { writeGen1PrizeLevel(rom, p2.lvOff!, v); onChange(); tick((t) => t + 1) } }}
                        onKeyDown={(e2) => { if (e2.key === 'Enter') (e2.target as HTMLInputElement).blur() }} />
                    </span>
                  </td>
                  <td>
                    <input defaultValue={p2.price} key={"g1pr" + i + "-" + p2.price} style={{ width: 64 }}
                      onBlur={(e2) => { const v = parseInt(e2.target.value, 10); if (!Number.isNaN(v) && v >= 1 && v <= 9999) { writeG1PrizePrice(rom, p2.costOff, v); onChange(); tick((t) => t + 1) } }}
                      onKeyDown={(e2) => { if (e2.key === 'Enter') (e2.target as HTMLInputElement).blur() }} />
                  </td>
                </tr>
              ))}
              {prizes1.tms.map((p2, i) => (
                <tr key={"t" + i}>
                  <td className="name" style={{ color: "var(--text-muted)" }}>招式机</td>
                  <td className="name"><span className="pf-name-text">{g1Zh[p2.item ?? 0] ?? "#" + (p2.item ?? 0)}</span></td>
                  <td>
                    <select value={p2.item ?? 0} key={"g1tm" + i + "-" + p2.item}
                      onChange={(e2) => { rom.writeU8(p2.itemOff ?? 0, parseInt(e2.target.value, 10)); onChange(); tick((t) => t + 1) }}
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: '100%', minWidth: 140 }}>
                      {Array.from({ length: 50 }, (_, k) => 0xc9 + k).map((iid) => (
                        <option key={iid} value={iid}>{g1Zh[iid] ?? "招式机" + (iid - 0xc8)}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input defaultValue={p2.price} key={"g1tpr" + i + "-" + p2.price} style={{ width: 64 }}
                      onBlur={(e2) => { const v = parseInt(e2.target.value, 10); if (!Number.isNaN(v) && v >= 1 && v <= 9999) { writeG1PrizePrice(rom, p2.costOff, v); onChange(); tick((t) => t + 1) } }}
                      onKeyDown={(e2) => { if (e2.key === 'Enter') (e2.target as HTMLInputElement).blur() }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
            数据来自 pokered prizes.asm 结构（PrizeMenuMon1/2 + TMs + PrizeMonLevelDictionary）。
            Gen1 枯叶市游戏中心 = 老虎机赚币，兑奖台兑换宝可梦/招式机；代币无法购买，需要玩老虎机或在「存档编辑」调代币（Gen2 专用功能）。
          </div>
        </div>
      </div>
    )
  }
  if (profile.gen !== 2) {
    return (
      <div className="empty"><h2>游戏中心</h2><p>当前版本仅支持 Gen 2（金/银/水晶）。</p></div>
    )
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="card">
        <div className="card-title">🎰 游戏中心奖品兑换</div>
        {prizes.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>未定位到奖品脚本（该 ROM 脚本区可能被重排）。</div>
        ) : (
          <table className="grid">
            <thead>
              <tr><th>奖品</th><th>当前</th><th>改为</th><th>价格（币）</th></tr>
            </thead>
            <tbody>
              {prizes.map((p, i) => (
                <tr key={i}>
                  <td className="name">{p.kind === 'pokemon' ? '宝可梦' : '道具'}</td>
                  <td className="name">
                    {p.kind === 'pokemon' ? (
                      <span className="pf-icon-cell"><PFIcon kind="pokemon" id={p.species!} size={32} />
                        <span className="pf-name-text">#{p.species} {speciesName(p.species!)} · Lv{p.level}</span></span>
                    ) : (
                      <span className="pf-name-text">{p.item! <= 57 && p.item! >= 51 ? '' : ''}{itemName(p.item!)}×{p.qty}</span>
                    )}
                  </td>
                  <td>
                    {p.kind === 'pokemon' ? (
                      <span style={{ display: 'flex', gap: 4 }}>
                        <select value={p.species} key={'sp' + i + '-' + p.species}
                          onChange={(e) => setPrize(p, { species: parseInt(e.target.value, 10) })}
                          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', flex: 1, minWidth: 130 }}>
                          {SPECIES_OPTIONS.map((sid) => (
                            <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                          ))}
                        </select>
                        <input defaultValue={p.level} key={'lv' + i + '-' + p.level} style={{ width: 44 }}
                          onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v >= 2 && v <= 100) setPrize(p, { level: v }) }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                      </span>
                    ) : (
                      <select value={p.item} key={'it' + i + '-' + p.item}
                        onChange={(e) => setPrize(p, { item: parseInt(e.target.value, 10) })}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: '100%', minWidth: 140 }}>
                        {ITEMS.map((iid) => (
                          <option key={iid} value={iid}>{itemName(iid)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <input defaultValue={p.price} key={'pr' + i + '-' + p.price} style={{ width: 64 }}
                      onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v >= 1 && v <= 9999) setPrize(p, { price: v }) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          价格同时写入脚本里的「检查代币」和「扣除代币」两处，保证一致。满金游戏中心 = 卡片翻牌（宝可梦 + 招式机奖品），枯叶游戏中心 = 老虎机（宝可梦奖品）。
        </div>
      </div>

      <div className="card">
        <div className="card-title">🪙 代币快速入手（改存档）</div>
        <div className="searchbar">
          <button className="secondary" onClick={openSavFile}>{savState ? '换一个存档' : '打开 .sav 存档'}</button>
          {savState && <span className="badge">当前代币：{savState.coins} / 9999</span>}
          {savState && <button onClick={() => addCoins(9999)}>一键 +9999</button>}
          {savState && <button className="secondary" onClick={() => addCoins(500)}>+500</button>}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>
          代币上限 9999（游戏内 Coin Case 显示上限）。也可以在「存档编辑」页手动精确调整。
        </div>
      </div>
    </div>
  )
}
