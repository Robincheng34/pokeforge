import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { resolveTrainerGroups, readTrainerGroup, writeTrainerField, convertTrainerToMoves, type TrainerEntry, type TrainerMon, type TrainerGroupRef, type ResolvedGroup } from '@core/trainers'
import { resolveEvosTable, readEvosEntryFor } from '@core/evos'
import { findGen1Trainers, readGen1Class, writeGen1MonLevel, writeGen1MonSpecies, GYMS_GEN1 } from '@core/trainers-gen1'
import { speciesName, moveName } from '@core/names'
import PFIcon, { PersonAvatar } from './PFIcon'
import { GenderBadge } from './badges'
import { personName, isGymLeader } from '@core/mapnames'
import gymRosters from '@core/gym-rosters.json'
import gen2Zh from '@core/gen2-items-zh.json'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const ITEM_ZH = gen2Zh as Record<number, string>
const ITEMS = Array.from({ length: 95 }, (_, i) => i + 1)
const MOVE_OPTIONS = Array.from({ length: 254 }, (_, i) => i + 1)

/** 类别英文名 → 中文（与 trainer_constants.asm 顺序一致） */
const CLASS_ZH: Record<string, string> = {
  FALKNER: '阿速（桔梗道馆）', WHITNEY: '小茜（满金道馆）', BUGSY: '阿吉（桧皮道馆）',
  MORTY: '松叶（缘朱道馆）', PRYCE: '柳伯（卡吉道馆）', JASMINE: '阿蜜（浅黄道馆）',
  CHUCK: '阿四（湛蓝道馆）', CLAIR: '小桩（烟墨道馆）', RIVAL1: '对手（前期）',
  POKEMON_PROF: '宝可梦博士', WILL: '一树（四天王1）', PKMN_TRAINER: '宝可梦训练家',
  BRUNO: '一也（四天王3）', KAREN: '梨花（四天王4）', KOGA: '阿桔（四天王2）',
  CHAMPION: '冠军', BROCK: '小刚（关都道馆）', MISTY: '小霞（关都道馆）',
  LT_SURGE: '马志士（关都道馆）', SCIENTIST: '科学家', ERIKA: '莉佳（关都道馆）',
  YOUNGSTER: '短裤小子', SCHOOLBOY: '学生哥', BIRD_KEEPER: '鸟饲育家',
  LASS: '迷你裙', JANINE: '阿杏（关都道馆）', COOLTRAINERM: '精英训练家♂',
  COOLTRAINERF: '精英训练家♀', BEAUTY: '美女', POKEMANIAC: '宝可梦狂',
  GRUNTM: '火箭队喽啰♂', GENTLEMAN: '绅士', SKIER: '滑雪者', TEACHER: '教师',
  SABRINA: '娜姿（关都道馆）', BUG_CATCHER: '捕虫少年', FISHER: '钓鱼客',
  SWIMMERM: '游泳选手♂', SWIMMERF: '游泳选手♀', SAILOR: '水手',
  SUPER_NERD: '超级书呆子', RIVAL2: '对手（后期）', GUITARIST: '吉他手',
  HIKER: '登山男', BIKER: '暴走族', BLAINE: '夏伯（关都道馆）', BURGLAR: '怪盗',
  FIREBREATHER: '喷火者', JUGGLER: '杂耍艺人', BLACKBELT_T: '空手道王',
  EXECUTIVEM: '火箭队干部♂', PSYCHIC_T: '超能力者', PICNICKER: '野餐少女',
  CAMPER: '露营少年', EXECUTIVEF: '火箭队干部♀', SAGE: '僧侣', MEDIUM: '灵媒',
  BOARDER: '滑板少年', POKEFANM: '宝可梦迷♂', KIMONO_GIRL: '和服少女',
  TWINS: '双胞胎', POKEFANF: '宝可梦迷♀', RED: 'RED', BLUE: '小茂（最后对战）',
  OFFICER: '警察', GRUNTF: '火箭队喽啰♀'
}

interface RosterEntry { group: number; id: number; label: string }
interface GymRoster { map: string; cn: string; roster: RosterEntry[] }
const GYMS = gymRosters as GymRoster[]

export default function LocationsEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [gymMap, setGymMap] = useState('')

  // 打开 ROM 时解析一次指针表（金/银/水晶偏移不同，动态定位）
  const resolved = useMemo(() => resolveTrainerGroups(rom), [opened])
  /** 分组解析缓存（同组多人共享一次解析） */
  const groupCache = useMemo(() => new Map<string, TrainerEntry[]>(), [rom.modifiedCount])

  function getTrainer(group: number, id: number): { entry: TrainerEntry; groupRef: TrainerGroupRef } | null {
    const gref = resolved.find((g) => g.num === group)
    if (!gref) return null
    const key = String(group)
    let trainers = groupCache.get(key)
    if (!trainers) {
      const gd = readTrainerGroup(rom, { label: 'g' + group, bank: gref.bank, addr: gref.addr }, 30)
      trainers = gd.trainers
      groupCache.set(key, trainers)
    }
    const entry = trainers[id - 1]
    if (!entry) return null
    return { entry, groupRef: { label: 'g' + group, bank: gref.bank, addr: gref.addr } }
  }

  function classZh(label: string): string {
    // label 形如 'BIRD_KEEPER.ROD'；类别中文名从花名册生成脚本记录的类别号映射
    const cls = label.split('.')[0]
    return CLASS_ZH[cls] ?? cls
  }

  function change(mon: TrainerMon, field: 'level' | 'species' | 'item' | 'move', raw: string, moveIndex?: number) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 0 || v > 255) return
    try {
      writeTrainerField(rom, mon, field, v, moveIndex)
      onChange()
    } catch { /* 忽略 */ }
  }

  if (profile.gen !== 2 && profile.gen !== 1) {
    return (
      <div className="empty">
        <h2>道馆人物</h2>
        <p>当前版本仅支持 Gen 1（红绿蓝黄）与 Gen 2（金/银/水晶）。</p>
      </div>
    )
  }

  const gym = GYMS.find((g) => g.map === gymMap) ?? GYMS[0]

  const isGen1 = profile.gen === 1
  if (isGen1) {
    const td = useMemo(() => findGen1Trainers(rom), [opened])
    const [, tick] = useState(0)
    const [g1i, setG1i] = useState(0)
    if (!td) return <div className="empty"><h2>道馆人物</h2><p>未定位到训练家数据表（该 ROM 结构异常）。</p></div>
    const cur = GYMS_GEN1[g1i]
    const trainers = readGen1Class(rom, td, cur.cls)
    const g1Change = (mon: { lvOff: number; spOff: number }, field: 'level' | 'species', raw: string) => {
      const v = parseInt(raw, 10)
      if (Number.isNaN(v)) return
      if (field === 'level' && v >= 1 && v <= 100) writeGen1MonLevel(rom, mon as never, v)
      if (field === 'species' && v >= 1 && v <= 151) writeGen1MonSpecies(rom, mon as never, v)
      onChange(); tick((x) => x + 1)
    }
    return (
      <div style={{ maxWidth: 900 }}>
        <div className="searchbar">
          <select value={g1i} onChange={(e2) => setG1i(parseInt(e2.target.value, 10))}
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}>
            {GYMS_GEN1.map((gm, i) => (
              <option key={i} value={i}>{gm.name}（{gm.sub}）</option>
            ))}
          </select>
          <span className="badge">{trainers.length} 人</span>
        </div>
        {trainers.map((tr, ti) => (
          <div key={ti} style={{ marginBottom: 16 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, margin: '6px 0 4px' }}>
              👑 {cur.name} · {cur.sub}
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
        <p style={{ color: 'var(--muted)', fontSize: 12 }}>Gen1 道馆首领与四天王：小刚/小霞/马志士/莉佳/阿桔/夏伯/娜姿 + 火箭队首领坂木 + 科拿/希巴/菊子/渡。</p>
      </div>
    )
  }
  // 升级学习表（转换普通队伍为带招式时填默认招式）
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

  // 分组上界（下一分组起始文件偏移）与转换
  function groupBoundary(num: number): number {
    const sorted = [...resolved].sort((a, b) => (a.bank * 0x4000 + (a.addr - 0x4000)) - (b.bank * 0x4000 + (b.addr - 0x4000)))
    const idx = sorted.findIndex((g) => g.num === num)
    const next = sorted[idx + 1]
    return next && next.bank === sorted[idx].bank ? next.bank * 0x4000 + (next.addr - 0x4000) : rom.size
  }
  function convertTrainer(group: number, id: number) {
    const gref = resolved.find((g) => g.num === group)
    if (!gref) return
    const r = convertTrainerToMoves(rom, gref, id - 1, groupBoundary(group), learnsetOf)
    if (r === null) {
      alert('转换失败：分组数据放不下（本 bank 没有足够的空闲空间），且原位扩展会越界。')
    }
    // 转换后整组缓存失效
    onChange()
  }

  // 四天王 · 冠军（直接按分组展示全部训练家）
  const E4_GROUPS = [
    { num: 11, cn: '四天王 1 · 一树' },
    { num: 15, cn: '四天王 2 · 阿桔' },
    { num: 13, cn: '四天王 3 · 一也' },
    { num: 14, cn: '四天王 4 · 梨花' },
    { num: 16, cn: '冠军 · 渡' }
  ]
  const [e4Num, setE4Num] = useState(0)
  const e4Group = E4_GROUPS.find((g) => g.num === e4Num)
  const e4Data = useMemo(() => {
    if (!e4Group) return null
    const gref = resolved.find((g) => g.num === e4Group.num)
    if (!gref) return null
    return readTrainerGroup(rom, gref, 10, groupBoundary(e4Group.num))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, rom.modifiedCount, e4Num])

  return (
    <>
      <div className="searchbar">
        <select
          value={e4Group ? 'e4:' + e4Group.num : gym.map}
          onChange={(e) => {
            if (e.target.value.startsWith('e4:')) { setE4Num(parseInt(e.target.value.slice(3), 10)); setGymMap('') }
            else { setE4Num(0); setGymMap(e.target.value) }
          }}
          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}
        >
          {GYMS.map((g) => (
            <option key={g.map} value={g.map}>{g.cn}</option>
          ))}
          {E4_GROUPS.map((g) => (
            <option key={g.num} value={'e4:' + g.num}>{g.cn}</option>
          ))}
        </select>
        <span className="badge">{e4Group ? (e4Data?.trainers.length ?? 0) + ' 人' : gym.roster.length + ' 个人物（馆主 + 馆内训练家）'}</span>
      </div>

      {e4Group && e4Data && e4Data.trainers.map((entry, ti) => (
        <div key={'e4' + ti} style={{ marginBottom: 18 }}>
          <div style={{ color: 'var(--accent)', fontWeight: 600, margin: '6px 0 4px' }}>
            {e4Group.cn} · 第 {ti + 1} 人
            <span className="badge" style={{ marginLeft: 8 }}>{entry.mons.length} 只宝可梦</span>
            {entry.type === 0 && (
              <button className="secondary" style={{ marginLeft: 8, height: 22, padding: '0 8px', fontSize: 11 }}
                onClick={() => convertTrainer(e4Group.num, ti + 1)}>
                启用自定义技能（转为带招式格式）
              </button>
            )}
          </div>
          <PartyGrid entry={entry} rom={rom} change={change} rowKey={'e4' + ti} bs={profile.baseStats} />
        </div>
      ))}

      {!e4Group && gym.roster.map((r, ti) => {
        const t = getTrainer(r.group, r.id)
        const entry = t?.entry
        return (
          <div key={ti} style={{ marginBottom: 18 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, margin: '6px 0 4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, verticalAlign: 'middle' }}><PersonAvatar label={personName(r.label)} boss={isGymLeader(r.label)} />{isGymLeader(r.label) ? '👑 ' : ''}{isGymLeader(r.label) ? classZh(r.label).split('（')[0] + ' · ' + (classZh(r.label).split('（')[1]?.replace('）','') ?? '') : personName(r.label) + '（' + classZh(r.label) + '）'}</span>
              <span className="badge" style={{ marginLeft: 8 }}>
                {entry ? `${entry.mons.length} 只宝可梦` : '解析失败'}
              </span>
              {entry && entry.type === 0 && (
                <button className="secondary" style={{ marginLeft: 8, height: 22, padding: '0 8px', fontSize: 11 }}
                  onClick={() => convertTrainer(r.group, r.id)}>
                  启用自定义技能（转为带招式格式）
                </button>
              )}
            </div>
            {entry && (
              <PartyGrid entry={entry} rom={rom} change={change} rowKey={'g' + ti} bs={profile.baseStats} />
            )}
          </div>
        )
      })}
      <p style={{ color: 'var(--muted)' }}>
        花名册来自游戏数据设计（道馆地图的人物分布），队伍内容读取自当前 ROM，可直接编辑。
        普通队伍（无招式数据）点「启用自定义技能」后即可逐招修改，默认招式按升级表自动填入。
      </p>
    </>
  )
}

/** 队伍表格（道馆/四天王共用） */
function PartyGrid({ entry, rom, change, rowKey, bs }: { entry: TrainerEntry; rom: OpenedRom['rom']; change: (mon: TrainerMon, field: 'level' | 'species' | 'item' | 'move', raw: string, moveIndex?: number) => void; rowKey: string; bs: OpenedRom['profile']['baseStats'] }) {
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
                        <input defaultValue={mon.level} key={`lv${rowKey}-${i}-${mon.level}`} style={{ width: 'auto' }}
                          onBlur={(e) => change(mon, 'level', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                      </td>
                      <td className="name"><span className="pf-icon-cell"><PFIcon kind="pokemon" id={mon.species} size={40} />
                        <select
                          value={mon.species}
                          onChange={(e) => change(mon, 'species', e.target.value)}
                          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                        >
                          {Array.from({ length: 252 }, (_, k) => k + 1).map((sid) => (
                            <option key={sid} value={sid}>#{sid} {speciesName(sid)}</option>
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
                            {ITEMS.map((iid) => (
                              <option key={iid} value={iid}>#{iid} {ITEM_ZH[iid] ?? '?'}</option>
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
