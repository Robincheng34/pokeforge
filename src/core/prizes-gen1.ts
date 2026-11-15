/**
 * Gen1 游戏中心奖品（pokered data/events/prizes.asm）：
 *   PrizeMenuMon1Entries/Cost、Mon2Entries/Cost、TMsEntries/Cost
 *   条目 = 物种(内部编号)×3 + '@'(0x50)；成本 = bcd2×3（4 位 BCD）+ '@'
 *   PrizeMonLevelDictionary = 6 组 (物种内部编号, 等级)
 * 扫描签名：Mon1Entries = [ABRA($5E=94), CLEFAIRY($04), 第三只, 0x50]
 */
import type { Rom } from './rom'
import { romMemo } from './cache'
import { GEN1_INTERNAL_DEX } from './evos'

export interface Gen1Prize { spOff?: number; itemOff?: number; lvOff?: number; costOff: number; species?: number; level?: number; item?: number; price: number }

export interface Gen1Prizes {
  mons: Gen1Prize[] // 6 只（组1×3 + 组2×3）
  tms: Gen1Prize[] // 3 台招式机
  entriesOff: number
}

const cache = new WeakMap<object, Gen1Prizes | null>()

export function findPrizesGen1(rom: Rom): Gen1Prizes | null {
  if (cache.has(rom)) return cache.get(rom)!
  const d = rom.data
  let out: Gen1Prizes | null = null
  // 版本无关扫描：TM 三连（3 个 $C9-$FA 连续）+ 0x50 + 3×bcd2 + 0x50，
  // 回溯验证 Mon2/Mon1 两块（物种 ≤$C0 + 0x50 终止 + 成本 BCD 合法）
  for (let i = 0x150; i < d.length - 60; i++) {
    if (!(d[i] >= 0xc9 && d[i] <= 0xfa && d[i + 1] >= 0xc9 && d[i + 1] <= 0xfa && d[i + 2] >= 0xc9 && d[i + 2] <= 0xfa)) continue
    if (d[i + 3] !== 0x50 || d[i + 10] !== 0x50) continue
    if (![0, 1, 2].every((k) => bcdValid(d[i + 4 + k * 2], d[i + 5 + k * 2]))) continue
    const mon2Off = i - 11, mon1Off = i - 22
    if (mon1Off < 0x150) continue
    if (d[mon2Off + 3] !== 0x50 || d[mon1Off + 3] !== 0x50 || d[mon2Off + 10] !== 0x50 || d[mon1Off + 10] !== 0x50) continue
    const spOk = (o: number) => [0, 1, 2].every((k) => d[o + k] >= 1 && d[o + k] <= 0xc0)
    if (!spOk(mon1Off) || !spOk(mon2Off)) continue
    if (![0, 1, 2].every((k) => bcdValid(d[mon1Off + 4 + k * 2], d[mon1Off + 5 + k * 2]))) continue
    if (![0, 1, 2].every((k) => bcdValid(d[mon2Off + 4 + k * 2], d[mon2Off + 5 + k * 2]))) continue
    const mon1: Gen1Prize[] = [0, 1, 2].map((k) => ({
      spOff: mon1Off + k,
      species: GEN1_INTERNAL_DEX[d[mon1Off + k]] ?? 0,
      costOff: mon1Off + 4 + k * 2,
      price: bcd2(d[mon1Off + 4 + k * 2], d[mon1Off + 5 + k * 2])
    }))
    const mon2: Gen1Prize[] = [0, 1, 2].map((k) => ({
      spOff: mon2Off + k,
      species: GEN1_INTERNAL_DEX[d[mon2Off + k]] ?? 0,
      costOff: mon2Off + 4 + k * 2,
      price: bcd2(d[mon2Off + 4 + k * 2], d[mon2Off + 5 + k * 2])
    }))
    const tms: Gen1Prize[] = [0, 1, 2].map((k) => ({
      itemOff: i + k,
      item: d[i + k],
      costOff: i + 4 + k * 2,
      price: bcd2(d[i + 4 + k * 2], d[i + 5 + k * 2])
    }))
    // PrizeMonLevelDictionary：6 对 (内部物种, 等级)，物种顺序 = 六个奖品顺序
    const spSeq = [d[mon1Off], d[mon1Off + 1], d[mon1Off + 2], d[mon2Off], d[mon2Off + 1], d[mon2Off + 2]]
    let lvOff = -1
    for (let k = i + 11; k < i + 500; k++) {
      if (spSeq.every((sp, j) => d[k + j * 2] === sp) && [0, 1, 2, 3, 4, 5].every((j) => d[k + j * 2 + 1] >= 2 && d[k + j * 2 + 1] <= 100)) {
        lvOff = k
        break
      }
    }
    const levels = [0, 1, 2, 3, 4, 5].map((k) => ({
      lvOff: lvOff >= 0 ? lvOff + k * 2 + 1 : -1,
      level: lvOff >= 0 ? d[lvOff + k * 2 + 1] : 0
    }))
    const mons = [...mon1, ...mon2]
    mons.forEach((p2, k) => { p2.level = levels[k]?.level ?? 0; p2.lvOff = levels[k]?.lvOff })
    out = { mons, tms, entriesOff: mon1Off }
    break
  }
  cache.set(rom, out)
  return out
}

function bcdValid(b0: number, b1: number): boolean {
  return (b0 >> 4) <= 9 && (b0 & 15) <= 9 && (b1 >> 4) <= 9 && (b1 & 15) <= 9
}

function bcd2(b0: number, b1: number): number {
  return (b0 >> 4) * 1000 + (b0 & 15) * 100 + (b1 >> 4) * 10 + (b1 & 15)
}

export function writeGen1Price(rom: Rom, off: number, price: number): void {
  const v = Math.max(0, Math.min(9999, Math.round(price)))
  const s = v.toString().padStart(4, '0')
  rom.data[off] = (parseInt(s[0], 10) << 4) | parseInt(s[1], 10)
  rom.data[off + 1] = (parseInt(s[2], 10) << 4) | parseInt(s[3], 10)
}

export function writeGen1PrizeSpecies(rom: Rom, off: number, dex: number): void {
  const internal = GEN1_INTERNAL_DEX.indexOf(dex)
  if (internal < 1) return
  rom.data[off] = internal
}

export function writeGen1PrizeLevel(rom: Rom, off: number, level: number): void {
  rom.data[off] = Math.max(2, Math.min(100, level))
}
