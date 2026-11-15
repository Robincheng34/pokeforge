/**
 * Gen2 属性相克表：3 字节条目（攻击属性, 防御属性, 倍率）+ 0xFF 终止
 * 倍率编码（十分位×10）：0=无效果, 5=效果减半, 10=普通, 20=双倍
 * 签名：NORMAL→ROCK 5 | NORMAL→STEEL 5 | FIRE→FIRE 5 | FIRE→WATER 5
 * 银/金/Tom_C @0x34D01，水晶 @0x34BB1
 */
import { romMemo } from './cache'
import { TYPES_GEN12 } from './profiles'

export const TYPE_MULT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: '×0 无效' },
  { value: 5, label: '×½ 效果减半' },
  { value: 10, label: '×1 普通' },
  { value: 20, label: '×2 效果绝佳' },
  { value: 40, label: '×4 效果绝佳²' }
]

export interface Matchup {
  atk: number
  def: number
  mult: number
  off: number
}

function findTypeMatchupUncached(
  rom: { readU8: (o: number) => number; size: number }
): number | null {
  const sig = Buffer.from('000505000905141405141505', 'hex')
  for (let i = 0x4000; i <= rom.size - sig.length; i++) {
    let ok = true
    for (let k = 0; k < sig.length; k++) if (rom.readU8(i + k) !== sig[k]) { ok = false; break }
    if (ok) return i
  }
  return null
}

export function readMatchups(rom: { readU8: (o: number) => number; size: number }, off: number): Matchup[] {
  const out: Matchup[] = []
  let cur = off
  for (let n = 0; n < 400; n++) {
    const a = rom.readU8(cur)
    if (a === 0xff) break
    out.push({ atk: a, def: rom.readU8(cur + 1), mult: rom.readU8(cur + 2), off: cur })
    cur += 3
  }
  return out
}

export function typeZh(id: number): string {
  return TYPES_GEN12[id] ?? `?${id}`
}

export function writeMult(
  rom: { writeU8: (o: number, v: number) => void },
  m: Matchup,
  mult: number
): void {
  rom.writeU8(m.off + 2, mult)
}

export function findTypeMatchup(rom: Parameters<typeof findTypeMatchupUncached>[0]) {
  return romMemo(rom, 'typeMatchup', () => findTypeMatchupUncached(rom))
}
