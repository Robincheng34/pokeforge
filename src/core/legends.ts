/**
 * Gen2 神兽遭遇定位与替换 + 游走三圣兽引擎补丁 + 存档直达
 *
 * 静态遭遇：地图脚本 loadwildmon(0x5C) <物种> <等级> startbattle(0x5E)
 *   洛奇亚(漩涡岛深处)、凤王(铃铛塔顶)、水君(G/S 铃铛塔? 见实际扫描)、时拉比(桧皮森林祭坛，水晶)
 * 游走宝可梦（G/S 雷公/炎帝）：引擎 InitRoamMons 例程写死物种与等级：
 *   3E F4(雷公) 3E F5(炎帝) ... 3E 28(40) 3E 28(40)
 * 直达：写存档 PlayerData3 副本 wMapGroup/wMapNumber/wYCoord/wXCoord (@0xA845-0xA848)
 */
import type { Rom } from './rom'
import { speciesName } from './names'

export interface LegendEncounter {
  name: string
  species: number
  level: number
  spOff: number
  lvOff: number
}

const LEGEND_IDS = new Set([243, 244, 245, 249, 250, 251])
const LEGEND_NAMES: Record<number, string> = {
  249: '洛奇亚',
  250: '凤王',
  243: '水君',
  244: '雷公',
  245: '炎帝',
  251: '时拉比'
}

const encCache = new WeakMap<object, LegendEncounter[]>()

/** 扫描脚本里的 loadwildmon(0x5C)+startbattle(0x5E) 神兽遭遇 */
export function findLegendEncounters(rom: Rom): LegendEncounter[] {
  if (encCache.has(rom)) return encCache.get(rom)!
  const d = rom.data
  const out: LegendEncounter[] = []
  for (let i = 0; i < d.length - 4; i++) {
    if (d[i] === 0x5c && d[i + 3] === 0x5e && LEGEND_IDS.has(d[i + 1]) && d[i + 2] >= 1 && d[i + 2] <= 100) {
      const sp = d[i + 1]
      out.push({ name: LEGEND_NAMES[sp] ?? speciesName(sp), species: sp, level: d[i + 2], spOff: i + 1, lvOff: i + 2 })
    }
  }
  encCache.set(rom, out)
  return out
}

export function writeLegendSpecies(rom: Rom, e: LegendEncounter, species: number): void {
  if (species < 1 || species > 252) return
  rom.writeU8(e.spOff, species)
}

export function writeLegendLevel(rom: Rom, e: LegendEncounter, level: number): void {
  if (level < 2 || level > 100) return
  rom.writeU8(e.lvOff, level)
}

// ---- 游走三圣兽（G/S：雷公/炎帝游走，引擎 InitRoamMons 写死物种与等级） ----
// 字节形态：3E F4 (ld a,RAIKOU) ea xx xx (存) 3E F5 (ld a,ENTEI) ea xx xx (存) 3E 28 (ld a,40) ea xx xx (存等级1) ea xx xx (存等级2，寄存器复用)
export interface RoamerInit {
  sp1Off: number // 雷公物种
  sp2Off: number // 炎帝物种
  lvOff: number // 等级写入处（改一处即可，两只共用 a=40）
}

const roamCache = new WeakMap<object, RoamerInit | null>()

export function findRoamerInit(rom: Rom): RoamerInit | null {
  if (roamCache.has(rom)) return roamCache.get(rom)!
  const d = rom.data
  for (let i = 0; i < d.length - 40; i++) {
    if (d[i] === 0x3e && d[i + 1] === 0xf4) {
      let sp2 = -1
      for (let k = i + 2; k < i + 10; k++) if (d[k] === 0x3e && d[k + 1] === 0xf5) { sp2 = k; break }
      if (sp2 < 0) continue
      // 等级写入：sp2 之后 24 字节内出现 3E 28
      let lv = -1
      for (let k = sp2 + 2; k < sp2 + 24; k++) if (d[k] === 0x3e && d[k + 1] === 0x28) { lv = k; break }
      if (lv < 0) continue
      const site: RoamerInit = { sp1Off: i + 1, sp2Off: sp2 + 1, lvOff: lv + 1 }
      roamCache.set(rom, site)
      return site
    }
  }
  roamCache.set(rom, null)
  return null
}

export function writeRoamerSpecies(rom: Rom, site: RoamerInit, which: 1 | 2, species: number): void {
  if (species < 1 || species > 252) return
  rom.writeU8(which === 1 ? site.sp1Off : site.sp2Off, species)
}

export function writeRoamerLevel(rom: Rom, site: RoamerInit, level: number): void {
  if (level < 2 || level > 100) return
  rom.writeU8(site.lvOff, level)
}

// ---- 一键直达（写存档当前位置；需已打开 .sav） ----
export interface LegendLocation {
  name: string
  pokemon: string
  group: number
  map: number
  y: number
  x: number
}

export const LEGEND_TELEPORTS: LegendLocation[] = [
  { name: '漩涡岛 · 洛奇亚所在层', pokemon: '洛奇亚', group: 3, map: 65, y: 9, x: 15 },
  { name: '铃铛塔顶层（凤王）', pokemon: '凤王', group: 15, map: 12, y: 9, x: 8 },
  { name: '白银山深处（RED 对战）', pokemon: 'RED', group: 3, map: 68, y: 14, x: 12 }
]

/** 写存档当前地图/坐标（saveedit.teleportTo 的封装；rom 为打开的 .sav） */
export function teleportSave(rom: Rom, loc: LegendLocation): void {
  rom.writeU8(0xa845, loc.group)
  rom.writeU8(0xa846, loc.map)
  rom.writeU8(0xa847, loc.y)
  rom.writeU8(0xa848, loc.x)
}
