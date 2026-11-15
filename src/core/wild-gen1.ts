/**
 * Gen1 野生遭遇（pokered data/wild/grass_water.asm）：
 *   WildDataPointers = 248 项 dw（顺序 = map id 序），数据连续存于 bank 3
 *   每图：[草丛率, 10×(等级,物种) 若率>0, 水面率, 10×(等级,物种) 若率>0]
 *   物种 = Gen1 内部编号；NothingWildMons = 00 00（各城市共享）
 */
import type { Rom } from './rom'
import { romMemo } from './cache'
import { GEN1_INTERNAL_DEX } from './evos'

const R1_SIG = Buffer.from([
  0x19, 0x03, 0x24, 0x03, 0xa5, 0x03, 0xa5, 0x02, 0xa5, 0x02, 0x24, 0x03, 0x24, 0x03, 0x24, 0x04, 0xa5, 0x04, 0x24, 0x05, 0x24
]) // 1号道路：率25 + 10 对（波波/小拉达）

export const GEN1_WILD_MAP_ZH: Record<number, string> = {
  12: '1号道路', 13: '2号道路', 14: '3号道路', 15: '4号道路', 16: '5号道路', 17: '6号道路',
  18: '7号道路', 19: '8号道路', 20: '9号道路', 21: '10号道路', 22: '11号道路', 23: '12号道路',
  24: '13号道路', 25: '14号道路', 26: '15号道路', 27: '16号道路', 28: '17号道路', 29: '18号道路',
  30: '19号水路', 31: '20号水路', 32: '21号水路', 33: '22号道路', 34: '23号道路', 35: '24号道路',
  36: '25号道路', 38: '常磐森林', 59: '月见山 1F', 60: '月见山 B1F', 61: '月见山 B2F',
  82: '石窟隧道 1F', 83: '无人发电厂', 108: '冠军之路 1F', 142: '宝可梦塔 1F', 143: '宝可梦塔 2F',
  144: '宝可梦塔 3F', 145: '宝可梦塔 4F', 146: '宝可梦塔 5F', 147: '宝可梦塔 6F', 148: '宝可梦塔 7F',
  159: '双子岛 B1F', 160: '双子岛 B2F', 161: '双子岛 B3F', 162: '双子岛 B4F', 165: '宝可梦屋 1F',
  192: '双子岛 1F', 194: '冠军之路 2F', 197: '地鼠洞窟', 198: '冠军之路 3F', 214: '宝可梦屋 2F',
  215: '宝可梦屋 3F', 216: '宝可梦屋 B1F', 217: '狩猎地带（东）', 218: '狩猎地带（北）',
  219: '狩猎地带（西）', 220: '狩猎地带（中央）', 226: '华蓝洞窟 2F', 227: '华蓝洞窟 B1F',
  228: '华蓝洞窟 1F', 232: '石窟隧道 B1F'
}

export interface Gen1WildSlot { level: number; species: number; lvOff: number; spOff: number }
export interface Gen1WildEntry {
  mapId: number
  name: string
  off: number
  grassRate: number
  grassRateOff: number
  grass: Gen1WildSlot[]
  waterRate: number
  waterRateOff: number
  water: Gen1WildSlot[]
}

interface WildTable { tableOff: number; bank: number; count: number }
const wtCache = new WeakMap<object, WildTable | null>()

/** 物体块：[率, (lv,sp)×N (N≤10，lv=0x00 即结束——Blue 部分地图只有 9 对), 率, (lv,sp)×M] */
function wildEntryLen(d: Buffer, off: number, romSize: number): number {
  if (off + 2 > romSize) return -1
  let cur = off
  const r1 = d[cur]; cur++
  if (r1 > 0) {
    for (let k = 0; k < 10; k++) {
      const lv = d[cur], sp = d[cur + 1]
      if (lv === 0) break
      if (lv > 100 || sp < 1 || sp > 0xbe) return -1
      cur += 2
    }
  }
  if (cur + 1 > romSize) return -1
  const r2 = d[cur]; cur++
  if (r2 > 0) {
    for (let k = 0; k < 10; k++) {
      const lv = d[cur], sp = d[cur + 1]
      if (lv === 0) break
      if (lv > 100 || sp < 1 || sp > 0xbe) return -1
      cur += 2
    }
  }
  return cur - off
}

export function findWildPointersGen1(rom: Rom): WildTable | null {
  if (wtCache.has(rom)) return wtCache.get(rom)!
  const d = rom.data
  const romSize = rom.size ?? d.length
  // 结构验证（版本无关）：表 = 连续 dw（≥60 项）；distinct word 数据地址按序被各块长度
  // 恰好铺满（允许块间零填充）——数据区连续无缝才算通过
  for (let x = 0x4000; x < d.length - 500; x++) {
    const words: number[] = []
    for (let n = 0; n < 260; n++) {
      const w = d[x + n * 2] | (d[x + n * 2 + 1] << 8)
      if (w < 0x4000 || w >= 0x8000) break
      words.push(w)
    }
    if (words.length < 60) continue
    for (let b = 1; b < 0x80; b++) {
      const data = (w: number) => b * 0x4000 + (w - 0x4000)
      const addrs = [...new Set(words.map(data))].sort((a, c) => a - c)
      if (addrs.length < 40) continue
      if (addrs[0] < b * 0x4000 || addrs[addrs.length - 1] >= (b + 1) * 0x4000) continue
      let tileOk = true
      let zeroPad = 0
      for (let i = 0; i < addrs.length - 1; i++) {
        const len = wildEntryLen(d, addrs[i], romSize)
        if (len <= 0) { tileOk = false; break }
        const end = addrs[i] + len
        if (end > addrs[i + 1]) { tileOk = false; break }
        if (end < addrs[i + 1]) {
          for (let z = end; z < addrs[i + 1]; z++) {
            if (d[z] !== 0) { tileOk = false; break }
            zeroPad++
          }
          if (!tileOk || zeroPad > 32) { tileOk = false; break }
        }
      }
      if (!tileOk) continue
      const out: WildTable = { tableOff: x, bank: b, count: words.length }
      wtCache.set(rom, out)
      return out
    }
  }
  wtCache.set(rom, null)
  return null
}

export function readGen1Wild(rom: Rom, table: WildTable, mapId: number): Gen1WildEntry | null {
  if (mapId < 0 || mapId >= table.count) return null
  const w = rom.readU8(table.tableOff + mapId * 2) | (rom.readU8(table.tableOff + mapId * 2 + 1) << 8)
  if (w < 0x4000 || w >= 0x8000) return null
  const off = table.bank * 0x4000 + (w - 0x4000)
  const d = rom.data
  let cur = off
  const grassRate = d[cur]
  const grassRateOff = cur
  cur++
  const grass: Gen1WildSlot[] = []
  if (grassRate > 0) {
    for (let k = 0; k < 10; k++) {
      const lv = d[cur]
      if (lv === 0) break // 0x00 填充（不足 10 对的表）
      const spInt = d[cur + 1]
      grass.push({ level: lv, species: GEN1_INTERNAL_DEX[spInt] ?? 0, lvOff: cur, spOff: cur + 1 })
      cur += 2
    }
  }
  const waterRate = d[cur]
  const waterRateOff = cur
  cur++
  const water: Gen1WildSlot[] = []
  if (waterRate > 0) {
    for (let k = 0; k < 10; k++) {
      const lv = d[cur]
      if (lv === 0) break
      const spInt = d[cur + 1]
      water.push({ level: lv, species: GEN1_INTERNAL_DEX[spInt] ?? 0, lvOff: cur, spOff: cur + 1 })
      cur += 2
    }
  }
  return { mapId, name: GEN1_WILD_MAP_ZH[mapId] ?? '地图 ' + mapId, off, grassRate, grassRateOff, grass, waterRate, waterRateOff, water }
}

/** 列出有野生数据的地图 */
export function listGen1WildMaps(rom: Rom, table: WildTable): number[] {
  const out: number[] = []
  for (let id = 0; id < table.count; id++) {
    const e = readGen1Wild(rom, table, id)
    if (e && (e.grassRate > 0 || e.waterRate > 0)) out.push(id)
  }
  return out
}

export function writeGen1WildLevel(rom: Rom, slot: Gen1WildSlot, level: number): void {
  if (level < 1 || level > 100) return
  rom.writeU8(slot.lvOff, level)
}

export function writeGen1WildSpecies(rom: Rom, slot: Gen1WildSlot, dex: number): void {
  const internal = GEN1_INTERNAL_DEX.indexOf(dex)
  if (internal < 1) return
  rom.writeU8(slot.spOff, internal)
}

export function writeGen1WildRate(rom: Rom, off: number, rate: number): void {
  rom.writeU8(off, Math.max(0, Math.min(255, rate)))
}
