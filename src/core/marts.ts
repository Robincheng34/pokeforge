/**
 * Gen2 商店货架：指针表（每店 1 word，bank 05）+ 条目（数量, 物品×N, 0xFF 结束）
 * 银/金标准位置 0x152fe（sym 05:62fe）；Tom_C 等搬移版暂不可用（指针表无效则返回 null）
 */
import { romMemo } from './cache'
import gen2Zh from './gen2-items-zh.json'

const ITEM_ZH = gen2Zh as Record<number, string>


export interface MartRef {
  index: number
  /** 店内物品文件偏移（数量字节处） */
  offset: number
  count: number
  items: Array<{ item: number; off: number }>
}

function findMartsPointerTableUncached(
  rom: { readU8: (o: number) => number; size: number },
  martBank = 0x05
): { tableOffset: number; count: number } | null {
  // 签名扫描：表首第 1 店必须是吉花市商店（伤药18/解毒药9/解麻药13/解眠药12），
  // 第 2 店为吉花市（图鉴后）= 精灵球(5) + 同 4 项。银/金/Tom_C/水晶实测全部命中。
  function tryParse(off: number): number[] | null {
    const count = rom.readU8(off)
    if (count < 1 || count > 10) return null
    const items: number[] = []
    for (let k = 0; k < count; k++) {
      const it = rom.readU8(off + 1 + k)
      if (it === 0 || it === 0xff) return null
      items.push(it)
    }
    if (rom.readU8(off + 1 + count) !== 0xff) return null
    return items
  }

  for (let x = 0x4000; x < rom.size - 128; x++) {
    const ptrs: number[] = []
    let ok = true
    for (let k = 0; k < 6; k++) {
      const p = rom.readU8(x + k * 2) | (rom.readU8(x + k * 2 + 1) << 8)
      if (p < 0x4000 || p >= 0x8000) { ok = false; break }
      ptrs.push(p)
    }
    if (!ok) continue
    for (let b = 1; b < 0x80 && b < Math.floor(rom.size / 0x4000); b++) {
      const first = tryParse(b * 0x4000 + (ptrs[0] - 0x4000))
      if (!first || first.join(',') !== '18,9,13,12') continue
      let all = 0
      for (let k = 0; k < 6; k++) if (tryParse(b * 0x4000 + (ptrs[k] - 0x4000))) all++
      if (all !== 6) continue
      let count = 0
      for (let n = 0; n < 100; n++) {
        const p = rom.readU8(x + n * 2) | (rom.readU8(x + n * 2 + 1) << 8)
        if (p < 0x4000 || p >= 0x8000) break
        if (!tryParse(b * 0x4000 + (p - 0x4000))) break
        count++
      }
      if (count >= 20) return { tableOffset: x, count }
    }
  }
  return null
}

export function readMart(
  rom: { readU8: (o: number) => number },
  tableOffset: number,
  martBank: number,
  index: number
): MartRef | null {
  const ptr = rom.readU8(tableOffset + index * 2) | (rom.readU8(tableOffset + index * 2 + 1) << 8)
  if (ptr < 0x4000 || ptr >= 0x8000) return null
  const off = martBank * 0x4000 + (ptr - 0x4000)
  const count = rom.readU8(off)
  if (count > 10) return null
  const items: MartRef['items'] = []
  for (let k = 0; k < count; k++) {
    items.push({ item: rom.readU8(off + 1 + k), off: off + 1 + k })
  }
  return { index, offset: off, count, items }
}

export function itemLabel(id: number): string {
  const zh = ITEM_ZH[id]
  if (zh) return `#${id} ${zh}`
  if (id >= 0xbf && id <= 0xf3) return `招式机 TM${id - 0xbe}`
  return `#${id}`
}

/** Gen2 常用可售物品（含 TM 前的普通道具 1-95） */
export const SELLABLE_ITEMS = Array.from({ length: 95 }, (_, i) => i + 1)

export function findMartsPointerTable(rom: Parameters<typeof findMartsPointerTableUncached>[0]) {
  return romMemo(rom, 'martsPointerTable', () => findMartsPointerTableUncached(rom))
}


// ---- Gen1（红绿蓝黄）商店货架：script_mart = FE <数量> <道具×N> FF（文本库内，bank0 起）----
export interface Gen1Mart { offset: number; count: number; items: number[] }
const martCache1 = new WeakMap<object, Gen1Mart[]>()

const GEN1_KEY_ITEMS = new Set([5, 6, 7, 9, 0x2d, 0x30, 0x3f, 0x40, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e])
const gen1Sellable = (id: number) => (id >= 1 && id <= 0x53 && !GEN1_KEY_ITEMS.has(id)) || (id >= 0xc9 && id <= 0xfa)

export function findMartsGen1(rom: { data: Buffer }): Gen1Mart[] {
  if (martCache1.has(rom)) return martCache1.get(rom)!
  const d = rom.data
  const out: Gen1Mart[] = []
  for (let i = 0x150; i < d.length - 16; i++) {
    if (d[i] !== 0xfe) continue
    const cnt = d[i + 1]
    if (cnt < 2 || cnt > 12) continue
    let ok = true
    for (let k = 0; k < cnt; k++) if (!gen1Sellable(d[i + 2 + k])) { ok = false; break }
    if (ok && d[i + 2 + cnt] === 0xff && i < 0x8000) {
      out.push({ offset: i, count: cnt, items: Array.from(d.slice(i + 2, i + 2 + cnt)) })
      i += 2 + cnt
    }
  }
  martCache1.set(rom, out)
  return out
}

/** 改货架槽位（数量不变，只换道具 id；增减会移位后续文本数据，不支持） */
export function writeGen1MartItem(rom: { data: Buffer }, mart: Gen1Mart, slot: number, id: number): void {
  if (slot < 0 || slot >= mart.count) return
  rom.data[mart.offset + 2 + slot] = id
}
