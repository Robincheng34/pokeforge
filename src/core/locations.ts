/**
 * 地点人物：扫描地图脚本区域内的 loadtrainer 指令（字节 0x5D + 组号 + 编号）
 * 结构对照 pokegold macros/scripts/events.asm：
 *   const loadtrainer_command = $5d
 *   loadtrainer: db $5d, trainer_group, trainer_id
 * 组号 = TrainerGroups 指针表索引（0 起）；编号 = 组内第 N 个条目（1 起）
 */
import mapScripts from './mapscripts.json'

export interface MapScriptRef {
  label: string
  bank: number
  addr: number
}

export const MAP_SCRIPTS = mapScripts as MapScriptRef[]

export interface MapLocationRef {
  ref: MapScriptRef
  /** 扫描结束偏移 = 同 bank 下一个地图脚本标签（sym 已排序） */
  endOffset: number
}

export function getLocationEnd(maps: MapScriptRef[], m: MapScriptRef, romSize: number): number {
  const idx = maps.findIndex((x) => x.label === m.label)
  const next = maps[idx + 1]
  return next && next.bank === m.bank ? next.bank * 0x4000 + (next.addr - 0x4000) : Math.min(m.bank * 0x4000 + 0x4000, romSize)
}

export function mapFileOffset(m: MapScriptRef): number {
  return m.bank * 0x4000 + (m.addr - 0x4000)
}

export interface LoadTrainerHit {
  opcodeOffset: number
  groupIndex: number
  trainerId: number
}

/** 扫描地图脚本区内的 loadtrainer 指令 */
export function scanLoadTrainers(
  rom: { readU8: (o: number) => number },
  m: MapScriptRef,
  endOffset: number,
  numGroups: number
): LoadTrainerHit[] {
  const start = mapFileOffset(m)
  const hits: LoadTrainerHit[] = []
  for (let i = start; i < endOffset - 2; i++) {
    if (rom.readU8(i) === 0x5d) {
      const g = rom.readU8(i + 1)
      const t = rom.readU8(i + 2)
      if (g < numGroups && t >= 1 && t <= 20) {
        hits.push({ opcodeOffset: i, groupIndex: g, trainerId: t })
      }
    }
  }
  return hits
}

/** 从 TrainerGroups 指针表（bank 0e @0x593e，即文件 0x3993e）读取分组地址（ROM 内权威顺序） */
export function readTrainerGroupPointerTable(
  rom: { readU8: (o: number) => number },
  tableOffset = 0x3993e,
  count = 64
): Array<{ groupIndex: number; addr: number; bank: number }> {
  const out: Array<{ groupIndex: number; addr: number; bank: number }> = []
  for (let i = 0; i < count; i++) {
    const ptr = rom.readU8(tableOffset + i * 2) | (rom.readU8(tableOffset + i * 2 + 1) << 8)
    if (ptr < 0x4000 || ptr >= 0x8000) break
    out.push({ groupIndex: i, addr: ptr, bank: 0x0e })
  }
  return out
}
