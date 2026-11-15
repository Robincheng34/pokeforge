/**
 * Gen1 定点传说宝可梦（红/绿/蓝/黄）：
 * 三圣鸟 + 超梦 = 地图物体事件（map object），编译序 8 字节：
 *   [sprite, y+4, x+4, movement($FF STAY / $FE WALK), range(方向常量 ≥0x80), TRAINER(0x40)|textId, 物种(内部编号), 等级]
 * 物种/等级字节可直接改写（改物种需写 Gen1 内部编号，显示用 GEN1_INTERNAL_DEX 翻译回图鉴号）。
 * 梦幻没有任何地图物体——正式获取只能官方配信，民间用 Trainer-Fly 漏洞（见 BUG 技巧库），在此提供说明卡。
 */
import type { Rom } from './rom'
import { GEN1_INTERNAL_DEX } from './evos'

export interface Gen1Legend {
  name: string
  species: number
  dex: number
  /** 物种字节文件偏移（内部编号） */
  spOff: number
  /** 等级字节文件偏移 */
  lvOff: number
  level: number
  /** 字典序标准位置提示 */
  location: string
}

const LEG_META: Array<{ dex: number; name: string; location: string }> = [
  { dex: 144, name: '急冻鸟', location: '双子岛 B4F' },
  { dex: 145, name: '闪电鸟', location: '无人发电厂' },
  { dex: 146, name: '火焰鸟', location: '冠军之路 2F' },
  { dex: 150, name: '超梦', location: '华蓝洞窟 B2F' }
]

const LEG_LEVELS = new Set([50, 70])
const cache = new WeakMap<object, Gen1Legend[]>()

export function findGen1Legends(rom: Rom): Gen1Legend[] {
  if (cache.has(rom)) return cache.get(rom)!
  const d = rom.data
  const byDex = new Map<number, Gen1Legend>()
  for (let i = 0x4000; i < d.length - 8; i++) {
    const spByte = d[i + 6], lv = d[i + 7]
    const meta = LEG_META.find((m) => GEN1_INTERNAL_DEX.indexOf(m.dex) === spByte)
    if (!meta) continue
    if (!LEG_LEVELS.has(lv)) continue
    const mv = d[i + 3], range = d[i + 4], flags = d[i + 5]
    if (mv !== 0xff && mv !== 0xfe) continue
    if (range < 0x80) continue
    if ((flags & 0x40) !== 0x40) continue
    const text = flags & 0x3f
    if (text < 1 || text > 20) continue
    const y = d[i + 1] - 4, x = d[i + 2] - 4
    if (y < 1 || x < 1 || y > 60 || x > 60) continue
    if (!byDex.has(meta.dex)) {
      byDex.set(meta.dex, { ...meta, species: meta.dex, dex: meta.dex, spOff: i + 6, lvOff: i + 7, level: lv })
    }
  }
  const out = LEG_META.filter((m) => byDex.has(m.dex)).map((m) => byDex.get(m.dex)!)
  cache.set(rom, out)
  return out
}

/** 写物种：入参图鉴号，写入 Gen1 内部编号字节 */
export function writeGen1LegendSpecies(rom: Rom, e: Gen1Legend, dex: number): void {
  const internal = GEN1_INTERNAL_DEX.indexOf(dex)
  if (internal < 1 || dex < 1) return
  rom.writeU8(e.spOff, internal)
}

export function writeGen1LegendLevel(rom: Rom, e: Gen1Legend, level: number): void {
  if (level < 2 || level > 100) return
  rom.writeU8(e.lvOff, level)
}


// ---- 初始宝可梦（OaksLab 脚本引用点）：ld a,<内部编号>; ld [wCurPartySpecies],a ----
export interface Gen1StarterSite {
  /** 引用点 species 字节文件偏移 */
  off: number
  /** 该处的内部编号 */
  internal: number
  dex: number
  /** ld [目标地址]（区分 wCurPartySpecies / wRivalStarterTemp 等用途） */
  target: number
}

const STARTER_DEX = [1, 4, 7, 25, 133]
const siteCache = new WeakMap<object, Gen1StarterSite[]>()

export function findGen1StarterSites(rom: Rom): Gen1StarterSite[] {
  if (siteCache.has(rom)) return siteCache.get(rom)!
  const d = rom.data
  const internalSet = new Set(STARTER_DEX.map((dx) => GEN1_INTERNAL_DEX.indexOf(dx)).filter((x) => x > 0))
  const out: Gen1StarterSite[] = []
  for (let i = 0x4000; i < d.length - 6; i++) {
    if (d[i] === 0x3e && internalSet.has(d[i + 1]) && d[i + 2] === 0xea) {
      const internal = d[i + 1]
      out.push({ off: i + 1, internal, dex: GEN1_INTERNAL_DEX[internal], target: d[i + 3] | (d[i + 4] << 8) })
    }
  }
  siteCache.set(rom, out)
  return out
}

/** 把某物种的全部引用点统一改成新图鉴号（写入内部编号字节） */
export function writeGen1StarterAll(rom: Rom, sites: Gen1StarterSite[], oldDex: number, newDex: number): number {
  const newInternal = GEN1_INTERNAL_DEX.indexOf(newDex)
  if (newInternal < 1) return 0
  let n = 0
  for (const st of sites) {
    if (st.dex === oldDex && newInternal > 0) {
      rom.writeU8(st.off, newInternal)
      st.internal = newInternal
      st.dex = newDex
      n++
    }
  }
  return n
}

// ---- 一键直达（写存档当前位置：wCurMap / wYCoord / wXCoord，红蓝黄通用）----
export const GEN1_SAV_MAP = 0x260a   // wCurMap
export const GEN1_SAV_Y = 0x260d     // wYCoord
export const GEN1_SAV_X = 0x260e     // wXCoord

/** 传说宝可梦所在地图 id（pokered map_constants 序） */
export const GEN1_LEGEND_MAPS: Record<number, { mapId: number; mapName: string }> = {
  144: { mapId: 162, mapName: '双子岛 B4F' },
  145: { mapId: 83, mapName: '无人发电厂' },
  146: { mapId: 194, mapName: '冠军之路 2F' },
  150: { mapId: 227, mapName: '华蓝洞窟 B1F' }
}

export interface Gen1LegendExt extends Gen1Legend {
  x: number
  y: number
}

export function getGen1LegendPos(rom: Rom, e: Gen1Legend): { x: number; y: number } {
  // 物体事件结构：[sprite, y+4, x+4, movement, range, flags, species, level] → 物种前 5/4 字节
  return { x: rom.data[e.spOff - 4] - 4, y: rom.data[e.spOff - 5] - 4 }
}

/** 直达：写存档当前地图与坐标（需已打开 .sav；写入后调用 fixGen1Checksum） */
export function teleportGen1Sav(rom: Rom, mapId: number, y: number, x: number): void {
  rom.data[GEN1_SAV_MAP] = mapId
  rom.data[GEN1_SAV_Y] = Math.max(0, y)
  rom.data[GEN1_SAV_X] = Math.max(0, x)
}
