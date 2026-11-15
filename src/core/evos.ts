import { romMemo } from './cache'
/**
 * Gen2 升级学习表（evos_attacks）：
 * 条目结构（pokegold data/pokemon/evos_attacks.asm）：
 *   进化条件若干条（EVOLVE_LEVEL/ITEM/TRADE/HAPPINESS/STAT，各自固定长度），0x00 终止
 *   升级技能 (level, move) 对若干条，0x00 终止
 * 指针表 252 项，按图鉴顺序，位于表所在 bank。
 * 位置通过妙蛙种子条目签名动态扫描定位（金/银/水晶及汉化版偏移不同）。
 */
export interface EvolutionEntry {
  /** 0=等级 1=道具 2=通信 3=亲密度 4=攻防比较(4字节) */
  type: number
  a: number
  b: number
  off: number
  text: string
}

export interface EvosEntry {
  evolutions: EvolutionEntry[]
  learns: Array<{ level: number; move: number; levelOff: number; moveOff: number }>
}

interface RomLike {
  readU8: (o: number) => number
  size: number
}

// 进化条件类型常量
const EVOLVE_LEVEL = 1
const EVOLVE_ITEM = 2
const EVOLVE_TRADE = 3
const EVOLVE_HAPPINESS = 4
const EVOLVE_STAT = 5

function evolutionLen(type: number, gen = 2): number {
  switch (type) {
    case EVOLVE_LEVEL: return 3
    case EVOLVE_ITEM: return gen === 1 ? 4 : 3 // Gen1 道具进化 = 4B（含最低等级 1）
    case EVOLVE_TRADE: return 3
    case EVOLVE_HAPPINESS: return gen === 1 ? -1 : 3 // Gen1 无
    case EVOLVE_STAT: return gen === 1 ? -1 : 4 // Gen1 无
    default: return -1
  }
}

/** 解析单个条目（文件偏移），失败返回 null */
export function parseEvosEntry(rom: RomLike, off: number, gen = 2): EvosEntry | null {
  let cur = off
  const evolutions: EvosEntry['evolutions'] = []
  // 进化条件
  for (let n = 0; n < 8; n++) {
    const type = rom.readU8(cur)
    if (type === 0x00) { cur++; break }
    const len = evolutionLen(type, gen)
    if (len < 0) return null
    let a = rom.readU8(cur + 1), b = rom.readU8(cur + 2)
    const c = rom.readU8(cur + 3)
    const gen1Sp = (v: number) => (gen === 1 ? (GEN1_INTERNAL_DEX[v] || 0) : v) // 内部编号→图鉴号（显示）
    let text = ''
    if (type === EVOLVE_LEVEL) { b = gen1Sp(b); text = `等级 ${a} → #${b}` }
    else if (type === EVOLVE_ITEM) {
      if (gen === 1) b = gen1Sp(rom.readU8(cur + 3)) // Gen1: 道具, 最低等级1, 物种(内部编号)
      text = `使用道具#${a} → #${b}`
    }
    else if (type === EVOLVE_TRADE) { b = gen1Sp(b); text = `通信交换 → #${b}` }
    else if (type === EVOLVE_HAPPINESS) text = `亲密度进化（${a === 1 ? '白天' : a === 2 ? '夜晚' : '全天'}）`
    else if (type === EVOLVE_STAT) text = `等级${a} 攻击${b === 1 ? '<' : b === 2 ? '>' : '='}防御 → #${c}`
    evolutions.push({ type, a, b, off: cur, text })
    cur += len
    if (cur > rom.size) return null
  }
  // 学习表 (level, move) 对
  const learns: EvosEntry['learns'] = []
  for (let n = 0; n < 20; n++) {
    const level = rom.readU8(cur)
    if (level === 0x00) break
    const move = rom.readU8(cur + 1)
    if (level > 100 || move === 0) return null
    learns.push({ level, move, levelOff: cur, moveOff: cur + 1 })
    cur += 2
  }
  if (learns.length === 0) return null
  return { evolutions, learns }
}

/**
 * Gen1 内部编号 → 图鉴号（pokered constants/pokemon_constants.asm 的 const 顺序 = 内部 id；
 * 引擎里 EvosMoves 指针表按内部 id 排序，不是图鉴顺序！MEW=21、BULBASAUR=153）。
 * 0 = 化石/幽灵/缺失占位。
 */
export const GEN1_INTERNAL_DEX: number[] = [0,112,115,32,35,21,100,34,80,2,103,108,102,88,94,29,31,104,111,131,59,151,130,90,72,92,123,120,9,127,114,0,0,58,95,22,16,79,64,75,113,67,122,106,107,24,47,54,96,76,0,126,0,125,82,109,0,56,86,50,128,0,0,0,83,48,149,0,0,0,84,60,124,146,144,145,132,52,98,0,0,0,37,38,25,26,0,0,147,148,140,141,116,117,0,0,27,28,138,139,39,40,133,136,135,134,66,41,23,46,61,62,13,14,15,0,85,57,51,49,87,0,0,10,11,12,68,0,55,97,42,150,143,129,0,0,89,0,99,91,0,101,36,110,53,105,0,93,63,65,17,18,121,1,3,73,0,118,119,0,0,0,0,77,78,19,20,33,30,74,137,142,0,81,0,0,4,7,5,8,6,0,0,0,0,43,44,45,69,70,71]

/**
 * 动态定位 EvosAttacks 指针表（表优先算法，金/银/水晶及汉化版实测）：
 * 1. 全 ROM 扫描 252 项指针表的候选位置（前 6 项指针有效）
 * 2. 尝试各 bank：用指针解析 dex1-6 的条目，必须全部合法且 Bulbasaur = 1 条进化（lv16→#2）
 * 3. 通过校验即为表首
 */
function resolveEvosTableUncached(
  rom: RomLike,
  gen = 2
): { tableOffset: number; bank: number; count: number } | null {
  const target = gen === 1 ? 190 : 252
  // 快速解析（无文字），用于扫描校验
  function quickParse(off: number): { evo: number; learns: number; target: number } | null {
    let cur = off
    let evo = 0
    let target = -1
    for (let n = 0; n < 8; n++) {
      const t = rom.readU8(cur)
      if (t === 0) { cur++; break }
      const len = evolutionLen(t, gen)
      if (len < 0) return null
      if (evo === 0) target = gen === 1 && t === 2 ? rom.readU8(cur + 3) : rom.readU8(cur + 2)
      evo++
      cur += len
    }
    let learns = 0
    for (let n = 0; n < 20; n++) {
      const lv = rom.readU8(cur)
      if (lv === 0) break
      const mv = rom.readU8(cur + 1)
      if (lv > 100 || mv === 0 || mv > 254) return null
      learns++
      cur += 2
    }
    return learns > 0 ? { evo, learns, target } : null
  }

  const maxBank = Math.min(0x80, Math.floor(rom.size / 0x4000))
  for (let x = 0x4000; x < rom.size - target * 2; x++) {
    const ptrs: number[] = []
    let ok = true
    for (let k = 0; k < 6; k++) {
      const p = rom.readU8(x + k * 2) | (rom.readU8(x + k * 2 + 1) << 8)
      if (p < 0x4000 || p >= 0x8000) { ok = false; break }
      ptrs.push(p)
    }
    if (!ok) continue
    for (let b = 1; b < maxBank; b++) {
      const readEntry = (i: number) => {
        const p = rom.readU8(x + i * 2) | (rom.readU8(x + i * 2 + 1) << 8)
        if (p < 0x4000 || p >= 0x8000) return null
        return quickParse(b * 0x4000 + (p - 0x4000))
      }
      if (gen === 1) {
        // 内部编号：RHYDON=1（无进化+有技能）、IVYSAUR=内部9（lv32→内部3 妙蛙花）、BULBASAUR=内部153（lv16→内部9）
        const venusaurInt = GEN1_INTERNAL_DEX.indexOf(3)
        const rhy = readEntry(0), ivy = readEntry(8), bulb = readEntry(152)
        if (!rhy || rhy.evo !== 0 || rhy.learns < 4) continue
        if (!ivy || ivy.target !== venusaurInt) continue
        if (!bulb || bulb.target !== 9) continue
        let all = 0
        for (const k of [0, 8, 9, 21, 84, 130]) {
          if (readEntry(k)) all++
        }
        if (all < 5) continue // 某些内部槽位（如缺失占位）合法地是空数据
        let count = 0
        for (let n = 0; n < target; n++) {
          const p = rom.readU8(x + n * 2) | (rom.readU8(x + n * 2 + 1) << 8)
          if (p < 0x4000 || p >= 0x8000) break
          count++
        }
        return { tableOffset: x, bank: b, count }
      } else {
        const r0 = quickParse(b * 0x4000 + (ptrs[0] - 0x4000))
        if (!r0 || r0.evo !== 1 || r0.learns < 4) continue // dex1 = 妙蛙种子：1 条等级进化 + ≥4 招式
        let all = 0
        for (let k = 0; k < 6; k++) {
          if (quickParse(b * 0x4000 + (ptrs[k] - 0x4000))) all++
        }
        if (all !== 6) continue
        let count = 0
        for (let n = 0; n < target; n++) {
          const p = rom.readU8(x + n * 2) | (rom.readU8(x + n * 2 + 1) << 8)
          if (p < 0x4000 || p >= 0x8000) break
          count++
        }
        return { tableOffset: x, bank: b, count }
      }
    }
  }
  return null
}

export function readEvosEntryFor(
  rom: RomLike,
  table: { tableOffset: number; bank: number; count: number },
  dexId: number,
  gen = 2
): EvosEntry | null {
  let slot = dexId
  if (gen === 1) {
    // Gen1 指针表按内部编号排序：图鉴号 → 内部 id
    slot = GEN1_INTERNAL_DEX.indexOf(dexId)
    if (slot < 1) return null
  }
  if (slot < 1 || slot > table.count) return null
  const ptr = rom.readU8(table.tableOffset + (slot - 1) * 2) | (rom.readU8(table.tableOffset + (slot - 1) * 2 + 1) << 8)
  if (ptr < 0x4000 || ptr >= 0x8000) return null
  const off = table.bank * 0x4000 + (ptr - 0x4000)
  return parseEvosEntry(rom, off, gen)
}

export function resolveEvosTable(rom: Parameters<typeof resolveEvosTableUncached>[0], gen = 2) {
  return romMemo(rom, 'evosTable' + gen, () => resolveEvosTableUncached(rom, gen))
}
