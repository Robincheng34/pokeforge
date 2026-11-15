import { romMemo } from './cache'
/**
 * Gen2 三圣兽（雷公/炎帝）游走地图表（RoamMaps）：
 * 条目：[起点group, 起点map, 目标数, (目标group, 目标map)×N, 0x00] × 16，-1? 无（末尾由游戏按条目数读取）
 * 水君在金银中为定点，不在本表。
 * 签名：entry1 = R29(24,3) 目标2个 = R30(26,1) R46(5,9) → '18 03 02 1a 01 05 09 00'
 * 银/金 @0x2a955，水晶 @0x2a3ff，水晶改 @0x2a403，Tom_C @0x2aa40（实测）
 */
export const ROAM_ROUTES: Array<{ group: number; map: number; label: string }> = [
  { group: 24, map: 3, label: '29号道路' },
  { group: 26, map: 1, label: '30号道路' },
  { group: 26, map: 2, label: '31号道路' },
  { group: 10, map: 1, label: '32号道路' },
  { group: 8, map: 6, label: '33号道路' },
  { group: 11, map: 1, label: '34号道路' },
  { group: 10, map: 2, label: '35号道路' },
  { group: 10, map: 3, label: '36号道路' },
  { group: 10, map: 4, label: '37号道路' },
  { group: 1, map: 12, label: '38号道路' },
  { group: 1, map: 13, label: '39号道路' },
  { group: 2, map: 5, label: '42号道路' },
  { group: 9, map: 5, label: '43号道路' },
  { group: 2, map: 6, label: '44号道路' },
  { group: 5, map: 8, label: '45号道路' },
  { group: 5, map: 9, label: '46号道路' }
]

export function routeLabel(group: number, map: number): string {
  const r = ROAM_ROUTES.find((r) => r.group === group && r.map === map)
  return r ? r.label : `未知地图 g${group} m${map}`
}

function findRoamMapsUncached(
  rom: { readU8: (o: number) => number; size: number }
): number | null {
  const sig = Buffer.from('1803021a01050900', 'hex')
  for (let i = 0x4000; i <= rom.size - sig.length; i++) {
    let ok = true
    for (let k = 0; k < sig.length; k++) {
      if (rom.readU8(i + k) !== sig[k]) { ok = false; break }
    }
    if (ok) return i
  }
  return null
}

export interface RoamEntry {
  startOff: number
  start: { group: number; map: number }
  targets: Array<{ group: number; map: number; gOff: number; mOff: number }>
}

export function readRoamEntries(
  rom: { readU8: (o: number) => number; size: number },
  off: number
): RoamEntry[] {
  const out: RoamEntry[] = []
  let cur = off
  for (let e = 0; e < 16 && cur < rom.size; e++) {
    const startOff = cur
    const start = { group: rom.readU8(cur), map: rom.readU8(cur + 1) }
    cur += 2
    const count = rom.readU8(cur)
    if (count > 5) break
    cur++
    const targets: RoamEntry['targets'] = []
    for (let k = 0; k < count; k++) {
      targets.push({ group: rom.readU8(cur), map: rom.readU8(cur + 1), gOff: cur, mOff: cur + 1 })
      cur += 2
    }
    cur++ // 跳过条目结束符 0x00（漏掉会导致后续条目全部错位）
    out.push({ startOff, start, targets })
  }
  return out
}

export function writeRoamMap(
  rom: { writeU8: (o: number, v: number) => void },
  off: number,
  group: number,
  map: number
): void {
  rom.writeU8(off, group)
  rom.writeU8(off + 1, map)
}

export function findRoamMaps(rom: Parameters<typeof findRoamMapsUncached>[0]) {
  return romMemo(rom, 'roamMaps', () => findRoamMapsUncached(rom))
}
