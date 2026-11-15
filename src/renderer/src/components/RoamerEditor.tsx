import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { findRoamMaps, readRoamEntries, writeRoamMap, routeLabel, ROAM_ROUTES } from '@core/roamers'
import { findGen1Legends, writeGen1LegendSpecies, writeGen1LegendLevel, getGen1LegendPos, GEN1_LEGEND_MAPS, teleportGen1Sav, type Gen1Legend } from '@core/legends-gen1'
import { openGen1Sav, fixGen1Checksum } from '@core/saveedit-gen1'
import { openSav, fixSavChecksum } from '@core/saveedit'
import { LEGEND_TELEPORTS, teleportSave } from '@core/legends'
import { GEN1_INTERNAL_DEX } from '@core/evos'
import { speciesName } from '@core/names'
import PFIcon from './PFIcon'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

export default function RoamerEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [filter, setFilter] = useState('')

  const isGen1 = profile.gen === 1

  if (profile.gen !== 2 && !isGen1) {
    return <div className="empty"><h2>三圣兽游走路线</h2><p>当前版本仅支持 Gen 1 / Gen 2。</p></div>
  }

  // ---- Gen1：三圣鸟 + 超梦（地图物体事件定点遭遇）+ 梦幻隐藏款说明卡 ----
  const legends1 = useMemo(() => (isGen1 ? findGen1Legends(rom) : []), [opened])
  const [, tick1] = useState(0)
  if (isGen1) {
    const wG1 = window as unknown as { __pfGen1SavRom?: OpenedRom['rom']; __pfGen1SavPath?: string }
    const g1Sav = wG1.__pfGen1SavRom
    const g1SavPath = wG1.__pfGen1SavPath
    async function openGen1SavFile() {
      const result = await window.pokeforge.openRom()
      if (!result) return
      const savRom2 = { data: Buffer.from(result.data), platform: 'gb' } as OpenedRom['rom']
      const info = openGen1Sav(savRom2)
      if (!info.ok) { alert('不是有效的 Gen1 存档：' + (info.reason ?? '')); return }
      wG1.__pfGen1SavRom = savRom2
      wG1.__pfGen1SavPath = result.filePath
      tick1((t) => t + 1)
    }
    function teleportG1(e: Gen1Legend) {
      if (!g1Sav) { void openGen1SavFile(); return }
      const mapInfo = GEN1_LEGEND_MAPS[e.dex]
      const pos = getGen1LegendPos(rom, e)
      teleportGen1Sav(g1Sav, mapInfo.mapId, pos.y, pos.x)
      fixGen1Checksum(g1Sav)
      void window.pokeforge.saveRom(wG1.__pfGen1SavPath ?? '', g1Sav.data.buffer as ArrayBuffer)
      alert('已把存档位置改到「' + e.name + ' · ' + mapInfo.mapName + '」。读档后走近触发对战即可（该传说未被击败时才出现）。')
    }
    return (
      <div style={{ maxWidth: 820 }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>🐦 三圣鸟 + 超梦（本世代的定点传说遭遇）</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
            Gen1 没有游走圣兽——三圣鸟与超梦都是地图物体上的定点战斗（物种+等级写在地图物体数据里，可直接改）。
            改物种请选图鉴号（写入时自动转换成 Gen1 内部编号字节）。
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="secondary" style={{ height: 26, fontSize: 12 }} onClick={openGen1SavFile}>{g1Sav ? '换一个存档' : '打开 .sav 存档（直达用）'}</button>
            {g1Sav && <span className="badge" style={{ fontSize: 11 }}>{g1SavPath}</span>}
          </div>
        </div>
        {legends1.length === 0 ? (
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>未定位到传说宝可梦物体事件（该 ROM 脚本区可能被重排，可在领取/对战后到存档里改）。</div>
        ) : (
          <table className="grid">
            <thead>
              <tr><th>宝可梦</th><th>当前</th><th>改为</th><th>等级</th><th>直达</th></tr>
            </thead>
            <tbody>
              {legends1.map((e: Gen1Legend, i) => {
                const curDex = GEN1_INTERNAL_DEX[rom.readU8(e.spOff)] || 0
                return (
                  <tr key={i}>
                    <td className="name">{e.name}<span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{e.location}</span></td>
                    <td>
                      <span className="pf-icon-cell">
                        <PFIcon kind="pokemon" id={curDex} size={40} />
                        <span className="pf-name-text">#{curDex} {speciesName(curDex)}</span>
                      </span>
                    </td>
                    <td>
                      <select
                        value={curDex}
                        key={'g1sp' + i + '-' + curDex}
                        onChange={(ev) => { writeGen1LegendSpecies(rom, e, parseInt(ev.target.value, 10)); onChange(); tick1((t) => t + 1) }}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                      >
                        {Array.from({ length: 151 }, (_, k) => k + 1).map((sid) => (
                          <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        defaultValue={e.level}
                        key={'g1lv' + i + '-' + e.level}
                        style={{ width: 48 }}
                        onBlur={(ev) => { const v = parseInt(ev.target.value, 10); if (!Number.isNaN(v) && v >= 2 && v <= 100) { writeGen1LegendLevel(rom, e, v); onChange() } }}
                        onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur() }}
                      />
                    </td>
                    <td><button onClick={() => teleportG1(e)}>🚀 直达</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
          <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>✨ 隐藏款 · 梦幻（#151）获取方式</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'grid', gap: 6 }}>
            <div>🏆 <strong>官方配信（唯一正规途径）</strong>：初代梦幻只通过任天堂官方活动发放（1996 年「サントリー梦幻配信」等，用联机电缆现场写入存档）。ROM 层面没有任何遭遇数据——正常游玩永远遇不到。</div>
            <div>🐛 <strong>Trainer-Fly 漏洞（民间通用，无需改动本 ROM）</strong>：利用「训练师离开屏幕时游戏不取消战斗」的漏洞跳到特殊训练师，让对方最后一战单位（特殊个体值 21）复现成梦幻。红/绿/蓝/黄全版本可用，详细步骤见「BUG 技巧库」。</div>
            <div>🔧 <strong>改 ROM 实现</strong>：最简单的方法是把上面三圣鸟/超梦其中一个改成梦幻（选 #151）+ 改等级 20，然后去那个洞窟正常捕捉。</div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Gen2 直达（神兽卡片合并自「神兽直达」页）----
  const w2 = window as unknown as { __pfSavRom?: OpenedRom['rom']; __pfSavPath?: string }
  const g2Sav = w2.__pfSavRom
  const g2SavPath = w2.__pfSavPath
  const [, tick2] = useState(0)
  async function openGen2SavFile() {
    const result = await window.pokeforge.openRom()
    if (!result) return
    const savRom2 = { data: Buffer.from(result.data), platform: 'gb' } as OpenedRom['rom']
    const info = openSav(savRom2)
    if (!info.ok) { alert('不是有效的金银水晶存档：' + (info.reason ?? '')); return }
    w2.__pfSavRom = savRom2
    w2.__pfSavPath = result.filePath
    tick2((t) => t + 1)
  }
  function teleportG2(idx: number) {
    if (!g2Sav) { void openGen2SavFile(); return }
    const loc = LEGEND_TELEPORTS[idx]
    teleportSave(g2Sav, loc)
    fixSavChecksum(g2Sav)
    void window.pokeforge.saveRom(g2SavPath ?? '', g2Sav.data.buffer as ArrayBuffer)
    alert('已把存档位置改到「' + loc.name + '」。读档后直接面对神兽。')
  }

  const off = useMemo(() => findRoamMaps(rom), [opened])
  const entries = useMemo(() => (off !== null ? readRoamEntries(rom, off) : []), [off, rom.modifiedCount])

  const routeOptions = ROAM_ROUTES.filter((r) => {
    if (!filter.trim()) return true
    return r.label.includes(filter.trim())
  })

  return (
    <>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {[{ id: 243, n: '雷公', d: '游走' }, { id: 244, n: '炎帝', d: '游走' }, { id: 245, n: '水君', d: '定点（铃铛塔顶层）' }].map((b) => (
          <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <PFIcon kind="pokemon" id={b.id} size={40} />
            <span><strong style={{ color: 'var(--accent)' }}>{b.n}</strong><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>#{b.id} · {b.d}</span></span>
          </span>
        ))}
        <span style={{ color: 'var(--muted)', fontSize: 12, flex: 1, minWidth: 200 }}>
          释放后雷公与炎帝共用同一张游走路线表随机出没（换地图随机跳转到相邻道路）。水君金银中不游走。
        </span>
      </div>
      <div className="searchbar">
        <input placeholder="过滤道路（如：42 / 漩涡）" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {off !== null ? (
          <span className="badge">游走地图表 @ 0x{off.toString(16)} · {entries.length} 条路线（雷公/炎帝可停留并跳转的道路）</span>
        ) : (
          <span className="badge" style={{ color: 'var(--danger)' }}>未定位游走表</span>
        )}
      </div>
      {off !== null && (
        <>
          <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
            雷公与炎帝释放后在城都各道路间随机游走（换地图时会跳到相邻道路之一）。修改起点和跳转目标即可控制它们的出没范围——
            例如把某条道路的跳转目标全改成同一张图，就能「圈养」在指定区域蹲守捕捉。
            水君在金银中不游走（固定在铃铛塔）。列表中未出现的道路（40/41 号水路等）永远不会刷出圣兽。
          </p>
          <table className="grid">
            <thead>
              <tr>
                <th>#</th>
                <th>起点道路</th>
                <th>可跳转的道路</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const startLabel = routeLabel(e.start.group, e.start.map)
                if (filter.trim() && !startLabel.includes(filter.trim())) return null
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="name">{startLabel}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {e.targets.map((t, k) => (
                          <select
                            key={k}
                            value={t.map}
                            onChange={(ev) => {
                              const r = routeOptions.find((x) => x.map === parseInt(ev.target.value, 10)) ?? routeOptions[0]
                              writeRoamMap(rom, t.gOff, r.group, r.map)
                              onChange()
                            }}
                            style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                          >
                            {routeOptions.map((r) => (
                              <option key={r.group + '-' + r.map} value={r.map}>{r.label}</option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 12 }}>
            提示：跳转目标是「换地图时随机去往的相邻道路」，把所有目标改成同一条路即可把圣兽困在那条路蹲点。
            改动即时生效（未保存前不写入文件）。另外出没与否还和游戏内时间/未抓取状态有关。
          </p>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginTop: 10 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>🚀 神兽直达（写 .sav 当前位置）</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <button className="secondary" style={{ height: 26, fontSize: 12 }} onClick={openGen2SavFile}>{g2Sav ? '换一个存档' : '打开 .sav 存档（直达用）'}</button>
              {g2Sav && <span className="badge" style={{ fontSize: 11 }}>{g2SavPath}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {LEGEND_TELEPORTS.map((loc, i) => (
                <button key={i} className="secondary" style={{ height: 26, fontSize: 12 }} disabled={!g2Sav} onClick={() => teleportG2(i)}>
                  🚀 {loc.name.replace('（', ' · ').replace('）', '')}
                </button>
              ))}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
              直达 = 改写存档当前地图与坐标（自动重算校验和保存）。读档后直接面对神兽。
            </div>
          </div>
        </>
      )}
    </>
  )
}
