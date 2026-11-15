/**
 * Gen2 道具使用效果跳表（ItemEffects，_DoItemEffect 用 rst JumpTable 分发）：
 *   187 个 2 字节小端指针（所在 bank 内地址），条目顺序 = item id 1-187
 * 定位签名：word0 == word2（前两项同为精灵球效果）+ 连续 ≥180 个合法指针
 * 所有 ROM 的此表均被搬移过，必须动态扫描。
 * 指针目标地址 → 效果名：通过表中条目顺序（item-effects.json）互相映射——
 * 表本身就是“该 ROM 全部可用效果例程地址”的字典。
 */
import { romMemo } from './cache'
import effectOrder from './item-effects.json'

const EFFECT_ORDER = effectOrder as Array<{ index: number; name: string; zh: string }>

export interface ItemEffectEntry {
  id: number
  off: number
  ptr: number
}

export interface ItemEffectsTable {
  offset: number
  bank: number
  count: number
  entries: ItemEffectEntry[]
  /** 地址 → 效果中文名（由表中条目顺序反查） */
  addrLabel: Map<number, string>
}

function findItemEffectsTableUncached(
  rom: { readU8: (o: number) => number; size: number }
): ItemEffectsTable | null {
  for (let x = 0x4000; x < rom.size - 187 * 2; x++) {
    const w0 = rom.readU8(x) | (rom.readU8(x + 1) << 8)
    const w1 = rom.readU8(x + 2) | (rom.readU8(x + 3) << 8)
    if (w0 < 0x4000 || w0 >= 0x8000 || w0 !== w1) continue // 条目0/1 同为精灵球效果
    // 连续 180 个合法指针
    let valid = 0
    for (let n = 0; n < 187; n++) {
      const p = rom.readU8(x + n * 2) | (rom.readU8(x + n * 2 + 1) << 8)
      if (p >= 0x4000 && p < 0x8000) valid++
    }
    if (valid < 180) continue
    // 构造 addr→label 映射
    const addrLabel = new Map<number, string>()
    for (let n = 0; n < 187; n++) {
      const p = rom.readU8(x + n * 2) | (rom.readU8(x + n * 2 + 1) << 8)
      const info = EFFECT_ORDER[n]
      if (info && !addrLabel.has(p)) addrLabel.set(p, info.zh)
    }
    // 表所在 bank：用多数指针高位推不出（2 字节地址不含 bank）——
    // 但效果例程与表同 bank，且 _DoItemEffect 调用方在同一 bank，取表所在 ROM bank 即可
    const bank = Math.floor(x / 0x4000)
    return { offset: x, bank, count: 187, entries: [], addrLabel }
  }
  return null
}

export function readItemEffectsEntries(
  rom: { readU8: (o: number) => number },
  table: ItemEffectsTable
): ItemEffectEntry[] {
  const out: ItemEffectEntry[] = []
  for (let n = 0; n < table.count; n++) {
    const off = table.offset + n * 2
    const ptr = rom.readU8(off) | (rom.readU8(off + 1) << 8)
    out.push({ id: n + 1, off, ptr })
  }
  return out
}

export function writeItemEffect(
  rom: { writeU8: (o: number, v: number) => void },
  table: ItemEffectsTable,
  id: number,
  targetAddr: number
): void {
  const off = table.offset + (id - 1) * 2
  rom.writeU8(off, targetAddr & 0xff)
  rom.writeU8(off + 1, (targetAddr >> 8) & 0xff)
}

export function findItemEffectsTable(rom: Parameters<typeof findItemEffectsTableUncached>[0]) {
  return romMemo(rom, 'itemEffectsTable', () => findItemEffectsTableUncached(rom))
}
