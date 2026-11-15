import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { speciesName, moveName } from '@core/names'
import PFIcon from './PFIcon'
import { writeSpeciesField } from '@core/profiles'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const SCRIPT_SIG = Buffer.from([0x31, 0x1a, 0x00, 0x09, 0xbf, 0x41])

import { findGifts } from '@core/gifts'
import { findGen1StarterSites, writeGen1StarterAll, type Gen1StarterSite } from '@core/legends-gen1'
import { openGen1Sav, setPikachuFriendship, fixGen1Checksum } from '@core/saveedit-gen1'
import { GEN1_INTERNAL_DEX } from '@core/evos'
import { GenderBadge } from './badges'
import { findGiftPatchSite, readGiftPatchState, setGiftPokerus, setGiftDvMode, readGiftDvMode, type GiftPatchSite } from '@core/givepoke-patch'

export default function StartersEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  // 打开 ROM 时定位一次赠送事件（签名含物种字节，编辑后不能重扫，否则行会消失）
  const giftOffsets = useMemo(() => findGifts(rom).map((g: { def: { key: string; name: string; location: string; speciesOff: number; levelOff: number }; off: number }) => ({ def: g.def, off: g.off })), [opened])
  const starters = profile.starters

  const slots = useMemo(() => {
    if (!starters) return null
    return starters.slots.map((s) => {
      const sigOk =
        s.verifyBase !== undefined &&
        rom.readBytes(s.verifyBase, 6).equals(SCRIPT_SIG)
      const cur = rom.readU8(s.species)
      const secondOk = s.secondSpecies === undefined ? true : rom.readU8(s.secondSpecies) === cur
      return { ...s, sigOk, cur, secondOk }
    })
  }, [opened, rom.modifiedCount])

  const isGen1 = profile.gen === 1

  // ---- Gen1：OaksLab 脚本引用点统一改写 ----
  if (isGen1) {
    const sites = useMemo(() => findGen1StarterSites(rom), [opened])
    const [, tick] = useState(0)
    // 按图鉴号分组（同物种的所有引用点统一改写）
    const groups = useMemo(() => {
      const g = new Map<number, Gen1StarterSite[]>()
      for (const st of sites) {
        const list = g.get(st.dex) ?? []
        list.push(st)
        g.set(st.dex, list)
      }
      return [...g.entries()].map(([dex, list]) => ({ dex, sites: list }))
    }, [sites])
    const [pick, setPick] = useState<Record<number, string>>({})

    return (
      <div style={{ maxWidth: 760 }}>
        <div className="searchbar">
          <span className="badge">Gen1 · 初始宝可梦 = 脚本里的物种常量引用点，共 {sites.length} 处</span>
        </div>
        {groups.length === 0 ? (
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>未定位到初始宝可梦引用点（该 ROM 脚本区可能被重排）。</div>
        ) : (
          <table className="grid">
            <thead>
              <tr><th>初始宝可梦</th><th>改为</th><th>初始招式（该种族的图鉴数据）</th></tr>
            </thead>
            <tbody>
              {groups.map((grp, i) => {
                const curDex = GEN1_INTERNAL_DEX[rom.readU8(grp.sites[0].off)] || grp.dex
                const mvOff = (dex: number, k: number) => profile.baseStats.offset + (dex - (profile.baseStats.firstId ?? 0)) * profile.baseStats.entrySize + 15 + k
                return (
                  <tr key={i}>
                    <td className="name">
                      <span className="pf-icon-cell"><PFIcon kind="pokemon" id={curDex} size={40} />
                        <span className="pf-name-text">#{curDex} {speciesName(curDex)}</span></span>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>{grp.sites.length} 处引用点</span>
                    </td>
                    <td>
                      <select
                        value={pick[i] ?? ''}
                        onChange={(ev) => setPick((p) => ({ ...p, [i]: ev.target.value }))}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                      >
                        <option value="">选择宝可梦…</option>
                        {Array.from({ length: 151 }, (_, k) => k + 1).filter((sid) => sid !== grp.dex).map((sid) => (
                          <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                        ))}
                      </select>
                      <button
                        className="secondary"
                        style={{ height: 24, padding: '0 8px', fontSize: 11, marginLeft: 6 }}
                        disabled={!pick[i]}
                        onClick={() => {
                          const n = writeGen1StarterAll(rom, sites, grp.dex, parseInt(pick[i], 10))
                          onChange()
                          tick((t) => t + 1)
                          alert(n + ' 处引用点已改写。注意：对手的初始宝可梦按"你选的球"从另一组常量推导，游戏内文案不会自动跟随改动；建议开新游戏实测三只球的发放结果。')
                        }}
                      >
                        应用
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {[0, 1, 2, 3].map((k) => {
                          const curMv = rom.readU8(mvOff(curDex, k))
                          return (
                            <select
                              key={k}
                              value={curMv}
                              onChange={(ev) => { rom.writeU8(mvOff(curDex, k), parseInt(ev.target.value, 10)); onChange(); tick((t) => t + 1) }}
                              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                            >
                              <option value={0}>—</option>
                              {Array.from({ length: 165 }, (_, mid) => mid + 1).map((mid) => (
                                <option key={mid} value={mid}>{moveName(mid)}</option>
                              ))}
                            </select>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
          妙蛙种子/小火龙/杰尼龟的行对应空木研究所的三只精灵球（统一改写该物种的全部脚本引用点）；初始招式直接改该种族图鉴数据（+15..18），完整学习表在上方「升级技能表」。
          性别：初代没有性别系统——尼多兰♂/♀是两个独立种族，在"改为"下拉里直接选择即可。黄版打开时显示 皮卡丘（主角开局获得）与 伊布（对手）的引用点。
        </p>
        {(() => {
          const w = window as unknown as { __pfGen1SavRom?: OpenedRom['rom']; __pfGen1SavPath?: string }
          const savRom = w.__pfGen1SavRom
          const savPath = w.__pfGen1SavPath
          const isYellowRom = profile.name.includes('Yellow') || profile.name.includes('皮卡丘') || opened.fileName.toLowerCase().includes('pika') || opened.fileName.includes('皮卡丘')
          return (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
              <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>⚡ 黄版专属 · 皮卡丘亲密度调整</div>
              {!isYellowRom ? (
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>仅黄版（皮卡丘版）有此功能：亲密度存于 .sav（影响皮卡丘的心情事件与跟随行为判定）。</div>
              ) : !savRom ? (
                <button className="secondary" onClick={async () => {
                  const result = await window.pokeforge.openRom()
                  if (!result) return
                  const savRom2 = { data: Buffer.from(result.data), platform: 'gb' } as OpenedRom['rom']
                  const info = openGen1Sav(savRom2)
                  if (!info.ok) { alert('不是有效的 Gen1 存档：' + (info.reason ?? '')); return }
                  w.__pfGen1SavRom = savRom2
                  w.__pfGen1SavPath = result.filePath
                  onChange()
                }}>打开 .sav 存档（黄版）</button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span className="badge">{savPath}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    亲密度（0-255）
                    <input type="number" min={0} max={255}
                      defaultValue={savRom.readU8(0x2722)}
                      key={'pf' + savRom.readU8(0x2722)}
                      style={{ width: 70 }}
                      onBlur={(e2) => {
                        const v = parseInt(e2.target.value, 10)
                        if (Number.isNaN(v) || v < 0 || v > 255) return
                        setPikachuFriendship(savRom, v)
                        fixGen1Checksum(savRom)
                        void window.pokeforge.saveRom(savPath ?? '', savRom.data.buffer as ArrayBuffer)
                        alert('皮卡丘亲密度已写入并保存（校验和已重算）。读档后生效。')
                      }}
                      onKeyDown={(e2) => { if (e2.key === 'Enter') (e2.target as HTMLInputElement).blur() }} />
                  </label>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>255 = 最喜欢训练家。注意：需要先在游戏里存过档的 .sav（未开档的空白存档无效）。</span>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  if (!slots) {
    return (
      <div className="empty">
        <h2>初始宝可梦不可用</h2>
        <p>当前世代（gen{profile.gen}）的初始宝可梦编辑尚未支持：待实现</p>
      </div>
    )
  }

  function change(speciesOffset: number, secondOffset: number | undefined, raw: string) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 1 || v > 255) return
    rom.writeU8(speciesOffset, v)
    if (secondOffset !== undefined) rom.writeU8(secondOffset, v)
    onChange()
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="searchbar">
        <span className="badge">开局御三家 · ElmsLab 精灵球脚本 · 修改会同时写入脚本两处 species 字节</span>
      </div>
      <table className="grid">
        <thead>
          <tr>
            <th>球</th>
            <th>当前宝可梦</th>
            <th>改为（图鉴编号）</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s, i) => (
            <tr key={i}>
              <td>{s.label}</td>
              <td className="name"><span className="pf-icon-cell"><PFIcon kind="pokemon" id={s.cur} size={44} /><span className="pf-name-text">#{s.cur} {speciesName(s.cur)}</span><GenderBadge rom={rom} baseStats={profile.baseStats} species={s.cur} /></span></td>
              <td>
                <select
                  value={s.cur}
                  onChange={(ev) => change(s.species, s.secondSpecies, ev.target.value)}
                  style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                >
                  {Array.from({ length: 252 }, (_, k) => k + 1).map((sid) => (
                    <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                  ))}
                </select>
              </td>
              <td>
                {s.sigOk && s.secondOk ? (
                  <span style={{ color: 'var(--ok)' }}>✓ 脚本匹配</span>
                ) : (
                  <span style={{ color: 'var(--danger)' }}>⚠ 签名不符，请勿修改</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>🥚 波克比的蛋（桔梗市精灵中心助手赠送）</div>
        {(() => {
          const eggOff = (giftOffsets.find((x: { def: { key: string } }) => x.def.key === 'togepi-egg')?.off ?? null)
          if (eggOff === null) return <span style={{ color: 'var(--danger)' }}>未找到蛋发放脚本（ROM 结构异常）</span>
          const cur = rom.readU8(eggOff + 1)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span>当前蛋内宝可梦：</span>
              <select
                value={cur}
                onChange={(e) => { rom.writeU8(eggOff + 1, parseInt(e.target.value, 10)); onChange() }}
                style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
              >
                {Array.from({ length: 252 }, (_, k) => k + 1).map((sid) => (
                  <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                ))}
              </select>
              <GenderBadge rom={rom} baseStats={profile.baseStats} species={cur} />
              <span className="badge">脚本 @ 0x{eggOff.toString(16)} · 孵化等级 5 · 孵化周期按改后物种自动套用</span>
            </div>
          )
        })()}
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          改成任意宝可梦——孵出来就是它。注意剧情仍会把它当作“波克比的蛋”来称呼，孵出后展示给空木博士那段对话不影响游玩。
        </div>
      </div>
      {/* 赠送宝可梦附加状态 */}
      {(() => {
        const site = findGiftPatchSite(rom) as GiftPatchSite | null
        if (!site) {
          return (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
              <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>✨ 领取宝可梦附加状态</div>
              <div style={{ color: 'var(--danger)', fontSize: 12 }}>未定位到引擎 DV 生成例程（该 ROM 结构异常），闪光/病毒补丁不可用。可在领取后到「存档编辑」手动改。</div>
            </div>
          )
        }
        const st = readGiftPatchState(rom, site)
        const dvMode = readGiftDvMode(rom, site)
        const [, tick1] = useState(0)
        return (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>✨ 领取宝可梦附加状态</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                性别 / 闪光
                <select
                  value={dvMode}
                  onChange={(e2) => { setGiftDvMode(rom, site, e2.target.value as never); onChange(); tick1((t) => t + 1) }}
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                >
                  <option value="random">不强制（游戏随机）</option>
                  <option value="male">♂ 全部雄性</option>
                  <option value="female">♀ 全部雌性</option>
                  <option value="shiny">★ 闪光（DV 10/10/10/10）</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={st.pokerus}
                  onChange={(e2) => { setGiftPokerus(rom, site, e2.target.checked); onChange() }} />
                🦠 自带宝可病毒（努力值×2）
              </label>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
              通过改写引擎生成 DV 的例程实现（对全部赠送宝可梦生效：初始三家/伊布/巴尔郎/壶壶等；野生不受影响）。性别由「攻击+速度 DV 组合字节 vs 种族性别比」判定：全雄 = 0xFFFF（大于任意性别比）、全雌 = 0x0000（纯雄种族除外，引擎优先判定）、闪光 = 10/10/10/10（金银闪光判定）。
            </div>
          </div>
        )
      })()}
      {/* 赠送宝可梦 */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>🎁 全游戏赠送宝可梦</div>
        {(() => {
          const gifts = giftOffsets.filter((g) => g !== null) as Array<{ def: { key: string; name: string; location: string; speciesOff: number; levelOff: number }; off: number }>
          if (gifts.length === 0) return <span style={{ color: 'var(--muted)' }}>未找到赠送事件（该 ROM 脚本区可能被重排）</span>
          return (
            <table className="grid">
              <thead>
                <tr><th>礼物</th><th>地点</th><th>宝可梦</th><th>等级</th></tr>
              </thead>
              <tbody>
                {gifts.map((g, i) => {
                  const species = rom.readU8(g.off + g.def.speciesOff)
                  const level = rom.readU8(g.off + g.def.levelOff)
                  return (
                  <tr key={g.def.key}>
                    <td className="name">{g.def.name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{g.def.location}</td>
                    <td>
                      <select
                        value={species}
                        key={'sp' + i + '-' + species}
                        onChange={(e) => { rom.writeU8(g.off + g.def.speciesOff, parseInt(e.target.value, 10)); onChange() }}
                        style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                      >
                        {Array.from({ length: 252 }, (_, k) => k + 1).map((sid) => (
                          <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                        ))}
                      </select>
                      <GenderBadge rom={rom} baseStats={profile.baseStats} species={species} />
                    </td>
                    <td>
                      <input
                        defaultValue={level}
                        key={'lv' + i + '-' + level}
                        style={{ width: 48 }}
                        onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v >= 2 && v <= 100) { rom.writeU8(g.off + g.def.levelOff, v); onChange() } }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      />
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )
        })()}
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          覆盖游戏内全部赠送事件（伊布/巴尔郎/烈雀信件/凯西/吸盘魔偶/多边兽/壶壶）。水晶的奇怪之蛋（7选1）暂不支持。
        </div>
      </div>
      <p style={{ color: 'var(--muted)', marginTop: 10 }}>
        ⚠ 修改后请在模拟器中开新游戏验证：对手会拿到与你有属性克制关系的初始宝可梦，剧情文本不会自动跟随改动。
      </p>
    </div>
  )
}
