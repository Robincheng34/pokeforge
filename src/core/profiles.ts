/**
 * GameProfile：每个游戏的数据库布局描述（数据层抽象）
 * 偏移均为 ROM 文件偏移。标注 [待验证] 的偏移会用 pattern 校验器实测。
 */
import { Rom } from './rom'

export interface FieldDef {
  key: string
  label: string
  offset: number
  kind: 'u8' | 'u16'
  enum?: Record<number, string>
  /** 编辑器里的显示缩放（如 Gen3 effort yield 按 2bit 拆分，暂按原值展示） */
  note?: string
}

export interface TableProfile {
  /** 表首条文件偏移 */
  offset: number
  entrySize: number
  count: number
  /** 表首条对应的 ID（Gen1/Gen2 无 0 号条目时为 1，默认 0） */
  firstId?: number
  /** 校验用：ID → 预期字节 (文件内偏移相对表首) */
  verify?: Array<{ index: number; rel: number; value: number }>
}

export interface BaseStatsProfile extends TableProfile {
  fields: FieldDef[]
  /** 特殊条目（如 Gen1 Mew 独立存放） */
  overrides?: Record<number, number>
  /** 内部索引 → 图鉴号 的偏移量（Gen1 内部索引≠图鉴号） */
  dexOffset?: number
}

export interface MovesProfile extends TableProfile {
  fields: FieldDef[]
}

export interface StartersProfile {
  slots: Array<{
    label: string
    /** species 字节文件偏移 */
    species: number
    /** 脚本中第二处 species（Gen2 脚本内同一 species 出现两次） */
    secondSpecies?: number
    /** 脚本签名校验基准偏移（验证 31 1a 00 09 bf 41 前缀） */
    verifyBase?: number
  }>
}

export interface GameProfile {
  id: string
  gen: 1 | 2 | 3
  name: string
  baseStats: BaseStatsProfile
  moves?: MovesProfile
  starters?: StartersProfile
}

// ---- 枚举 ----

export const TYPES_GEN12: Record<number, string> = {
  0: '一般', 1: '格斗', 2: '飞行', 3: '毒', 4: '地面', 5: '岩石', 6: '鸟(废弃)',
  7: '虫', 8: '幽灵', 9: '钢', 10: '???',
  0x14: '火', 0x15: '水', 0x16: '草', 0x17: '电', 0x18: '超能力',
  0x19: '冰', 0x1a: '龙', 0x1b: '恶'
}
export const TYPES_GEN3: Record<number, string> = {
  0: '一般', 1: '格斗', 2: '飞行', 3: '毒', 4: '地面', 5: '岩石', 6: '虫', 7: '幽灵',
  8: '钢', 9: '???', 10: '火', 11: '水', 12: '草', 13: '电', 14: '超能力',
  15: '冰', 16: '龙', 17: '恶'
}
const GROWTH_GEN1: Record<number, string> = {
  0: '中等偏快', 1: '略快', 2: '略慢', 3: '中等偏慢', 4: '快', 5: '慢'
}
const GROWTH: Record<number, string> = {
  0: '中等偏快', 1: '忽快忽慢', 2: '忽慢忽快', 3: '中等偏慢', 4: '快', 5: '慢'
}

// ---- Gen 1 (红/蓝/黄，pokered 已确认) ----
import { moveName } from './names'
const GEN1_MOVES_ENUM: Record<number, string> = (() => { const e: Record<number, string> = { 0: '—' }; for (let i = 1; i <= 165; i++) e[i] = moveName(i); return e })()

const GEN1_BASE_FIELDS: FieldDef[] = [
  { key: 'dex', label: '图鉴号', offset: 0, kind: 'u8' },
  { key: 'hp', label: 'HP', offset: 1, kind: 'u8' },
  { key: 'atk', label: '攻击', offset: 2, kind: 'u8' },
  { key: 'def', label: '防御', offset: 3, kind: 'u8' },
  { key: 'spd', label: '速度', offset: 4, kind: 'u8' },
  { key: 'special', label: '特殊', offset: 5, kind: 'u8' },
  { key: 'type1', label: '属性1', offset: 6, kind: 'u8', enum: TYPES_GEN12 },
  { key: 'type2', label: '属性2', offset: 7, kind: 'u8', enum: TYPES_GEN12 },
  { key: 'catchRate', label: '捕获率', offset: 8, kind: 'u8' },
  { key: 'baseExp', label: '基础经验', offset: 9, kind: 'u8' },
  // +10 精灵图尺寸字节、+11..14 前后图指针（不可编辑）
  { key: 'move1', label: '初始招式1', offset: 15, kind: 'u8', enum: GEN1_MOVES_ENUM },
  { key: 'move2', label: '初始招式2', offset: 16, kind: 'u8', enum: GEN1_MOVES_ENUM },
  { key: 'move3', label: '初始招式3', offset: 17, kind: 'u8', enum: GEN1_MOVES_ENUM },
  { key: 'move4', label: '初始招式4', offset: 18, kind: 'u8', enum: GEN1_MOVES_ENUM },
  { key: 'growth', label: '成长曲线', offset: 19, kind: 'u8', enum: GROWTH_GEN1 }
  // +20..26 TM/HM 兼容 7 字节（55 位：TM01-50 + HM01-05），TMEditor 编辑；+27 padding
]

const GEN2_MOVES: FieldDef[] = [
  { key: 'anim', label: '动画', offset: 0, kind: 'u8' },
  { key: 'effect', label: '效果', offset: 1, kind: 'u8' },
  { key: 'power', label: '威力', offset: 2, kind: 'u8' },
  { key: 'type', label: '属性', offset: 3, kind: 'u8', enum: TYPES_GEN12 },
  { key: 'accuracy', label: '命中', offset: 4, kind: 'u8', note: 'percent 缩放: 0xFF=100%' },
  { key: 'pp', label: 'PP', offset: 5, kind: 'u8' },
  { key: 'chance', label: '附加概率', offset: 6, kind: 'u8' }
]

const GEN1_MOVES: FieldDef[] = [
  { key: 'anim', label: '动画', offset: 0, kind: 'u8' },
  { key: 'effect', label: '效果', offset: 1, kind: 'u8' },
  { key: 'power', label: '威力', offset: 2, kind: 'u8' },
  { key: 'type', label: '属性', offset: 3, kind: 'u8', enum: TYPES_GEN12 },
  { key: 'accuracy', label: '命中%', offset: 4, kind: 'u8' },
  { key: 'pp', label: 'PP', offset: 5, kind: 'u8' }
]

// ---- Gen 2 (金/银/水晶) ----

// Gen2 性别比（决定 DV 判定的离散值）：雌性概率 = (ratio+1)/256
export const GENDER_RATIO_GEN2: Record<number, string> = {
  0: '♂ 100%（纯雄）',
  31: '♂ 87.5% / ♀ 12.5%',
  63: '♂ 75% / ♀ 25%',
  95: '♂ 62.5% / ♀ 37.5%',
  127: '♂ 50% / ♀ 50%',
  191: '♂ 25% / ♀ 75%',
  254: '♀ 100%（纯雌）',
  255: '无性别'
}

const GEN2_BASE_FIELDS: FieldDef[] = [
  { key: 'dex', label: '图鉴号', offset: 0, kind: 'u8' },
  { key: 'hp', label: 'HP', offset: 1, kind: 'u8' },
  { key: 'atk', label: '攻击', offset: 2, kind: 'u8' },
  { key: 'def', label: '防御', offset: 3, kind: 'u8' },
  { key: 'spd', label: '速度', offset: 4, kind: 'u8' },
  { key: 'spAtk', label: '特攻', offset: 5, kind: 'u8' },
  { key: 'spDef', label: '特防', offset: 6, kind: 'u8' },
  { key: 'type1', label: '属性1', offset: 7, kind: 'u8', enum: TYPES_GEN12 },
  { key: 'type2', label: '属性2', offset: 8, kind: 'u8', enum: TYPES_GEN12 },
  { key: 'catchRate', label: '捕获率', offset: 9, kind: 'u8' },
  { key: 'baseExp', label: '基础经验', offset: 10, kind: 'u8' },
  { key: 'item1', label: '携带道具1', offset: 11, kind: 'u8' },
  { key: 'item2', label: '携带道具2', offset: 12, kind: 'u8' },
  { key: 'genderRatio', label: '性别', offset: 13, kind: 'u8', enum: GENDER_RATIO_GEN2 },
  { key: 'eggCycles', label: '孵化周期', offset: 15, kind: 'u8' },
  { key: 'growth', label: '成长曲线', offset: 22, kind: 'u8', enum: GROWTH },
  { key: 'eggGroup', label: '蛋组', offset: 23, kind: 'u8' }
]

// ---- Gen 3 (GBA) ----

const GEN3_BASE_FIELDS: FieldDef[] = [
  { key: 'hp', label: 'HP', offset: 0, kind: 'u8' },
  { key: 'atk', label: '攻击', offset: 1, kind: 'u8' },
  { key: 'def', label: '防御', offset: 2, kind: 'u8' },
  { key: 'spd', label: '速度', offset: 3, kind: 'u8' },
  { key: 'spAtk', label: '特攻', offset: 4, kind: 'u8' },
  { key: 'spDef', label: '特防', offset: 5, kind: 'u8' },
  { key: 'type1', label: '属性1', offset: 6, kind: 'u8', enum: TYPES_GEN3 },
  { key: 'type2', label: '属性2', offset: 7, kind: 'u8', enum: TYPES_GEN3 },
  { key: 'catchRate', label: '捕获率', offset: 8, kind: 'u8' },
  { key: 'baseExp', label: '基础经验', offset: 9, kind: 'u8' },
  { key: 'genderRatio', label: '性别比', offset: 16, kind: 'u8' },
  { key: 'eggCycles', label: '孵化周期', offset: 17, kind: 'u8' },
  { key: 'friendship', label: '初始亲密度', offset: 18, kind: 'u8' },
  { key: 'growth', label: '成长曲线', offset: 19, kind: 'u8', enum: GROWTH },
  { key: 'ability1', label: '特性1', offset: 22, kind: 'u8' },
  { key: 'ability2', label: '特性2', offset: 23, kind: 'u8' }
]

const GEN3_MOVES: FieldDef[] = [
  { key: 'effect', label: '效果', offset: 0, kind: 'u8' },
  { key: 'power', label: '威力', offset: 1, kind: 'u8' },
  { key: 'type', label: '属性', offset: 2, kind: 'u8', enum: TYPES_GEN3 },
  { key: 'accuracy', label: '命中', offset: 3, kind: 'u8' },
  { key: 'pp', label: 'PP', offset: 4, kind: 'u8' },
  { key: 'effectAcc', label: '附加命中', offset: 5, kind: 'u8' },
  { key: 'target', label: '目标', offset: 6, kind: 'u8' },
  { key: 'priority', label: '优先度', offset: 7, kind: 'u8' }
]

export const PROFILES: Record<string, GameProfile> = {
  green: {
    id: 'green', gen: 1, name: 'Pokémon Green',
    baseStats: { offset: 0x383de, entrySize: 28, count: 190, firstId: 1, fields: GEN1_BASE_FIELDS, overrides: { 151: 0x4262 } },
    moves: {
      offset: 0x38000, entrySize: 6, count: 165, firstId: 1, fields: GEN1_MOVES,
      verify: [{ index: 1, rel: 2, value: 40 }] // Pound power=40
    }
  },
  red: {
    id: 'red', gen: 1, name: 'Pokémon Red',
    baseStats: {
      // 实测：Bulbasaur @0x383DE，Gen1 表无 0 号条目；Mew 偏移各版本不同（loadProfile 自动重扫）
      offset: 0x383de, entrySize: 28, count: 190, firstId: 1,
      verify: [{ index: 1, rel: 1, value: 45 }], // Bulbasaur HP=45
      fields: GEN1_BASE_FIELDS,
      overrides: { 151: 0x4262 } // Mew（实测 Red 0x4262 / Blue 0x425B / Yellow 0x39446）
    },
    moves: {
      offset: 0x38000, entrySize: 6, count: 165, firstId: 1, fields: GEN1_MOVES,
      verify: [{ index: 1, rel: 2, value: 40 }] // Pound power=40
    }
  },
  blue: {
    id: 'blue', gen: 1, name: 'Pokémon Blue',
    baseStats: { offset: 0x383de, entrySize: 28, count: 190, firstId: 1, fields: GEN1_BASE_FIELDS, overrides: { 151: 0x425b } },
    moves: { offset: 0x38000, entrySize: 6, count: 165, firstId: 1, fields: GEN1_MOVES }
  },
  yellow: {
    id: 'yellow', gen: 1, name: 'Pokémon Yellow',
    // 实测：Bulbasaur @0x383DE 与红版相同；Mew @0x39446（黄版独有偏移）
    baseStats: { offset: 0x383de, entrySize: 28, count: 190, firstId: 1, fields: GEN1_BASE_FIELDS, overrides: { 151: 0x39446 } },
    moves: { offset: 0x38000, entrySize: 6, count: 165, firstId: 1, fields: GEN1_MOVES }
  },
  gold: {
    id: 'gold', gen: 2, name: 'Pokémon Gold',
    baseStats: {
      // 实测：Bulbasaur @0x51C90（研究资料 0x51B0B 有误）
      offset: 0x51c70, entrySize: 32, count: 252,
      verify: [{ index: 1, rel: 1, value: 45 }],
      fields: GEN2_BASE_FIELDS
    },
    moves: {
      // 实测：Pound @0x41B07（anim,effect,power,type,acc(percent 缩放 100%->0xFF),pp,chance）
      offset: 0x41b07, entrySize: 7, count: 254, firstId: 1,
      verify: [{ index: 1, rel: 2, value: 40 }],
      fields: GEN2_MOVES
    },
    starters: {
      slots: [
        { species: 0x1800c6 + 0x0c, label: '火球鼠（球1）', secondSpecies: 0x1800c6 + 0x0e, verifyBase: 0x1800c6 },
        { species: 0x180108 + 0x0c, label: '小锯鳄（球2）', secondSpecies: 0x180108 + 0x0e, verifyBase: 0x180108 },
        { species: 0x180144 + 0x0c, label: '菊草叶（球3）', secondSpecies: 0x180144 + 0x0e, verifyBase: 0x180144 }
      ]
    }
  },
  silver: {
    id: 'silver', gen: 2, name: 'Pokémon Silver',
    baseStats: {
      offset: 0x51c70, entrySize: 32, count: 252,
      verify: [{ index: 1, rel: 1, value: 45 }],
      fields: GEN2_BASE_FIELDS
    },
    moves: { offset: 0x41b07, entrySize: 7, count: 254, firstId: 1, verify: [{ index: 1, rel: 2, value: 40 }], fields: GEN2_MOVES },
    starters: {
      // 实测（原版与汉化版字节一致）：ElmsLab 三个精灵球脚本，species 位于 +0x0C/+0x0E
      slots: [
        { species: 0x1800c6 + 0x0c, label: '火球鼠（球1）', secondSpecies: 0x1800c6 + 0x0e, verifyBase: 0x1800c6 },
        { species: 0x180108 + 0x0c, label: '小锯鳄（球2）', secondSpecies: 0x180108 + 0x0e, verifyBase: 0x180108 },
        { species: 0x180144 + 0x0c, label: '菊草叶（球3）', secondSpecies: 0x180144 + 0x0e, verifyBase: 0x180144 }
      ]
    }
  },
  crystal: {
    id: 'crystal', gen: 2, name: 'Pokémon Crystal',
    baseStats: {
      offset: 0x51404, entrySize: 32, count: 252,
      verify: [{ index: 1, rel: 1, value: 45 }],
      fields: GEN2_BASE_FIELDS
    }
  },
  ruby: {
    id: 'ruby', gen: 3, name: 'Pokémon Ruby',
    baseStats: { offset: 0x1fec18, entrySize: 28, count: 387, verify: [{ index: 1, rel: 0, value: 45 }], fields: GEN3_BASE_FIELDS },
    moves: { offset: 0x1fb12c, entrySize: 12, count: 354, fields: GEN3_MOVES }
  },
  sapphire: {
    id: 'sapphire', gen: 3, name: 'Pokémon Sapphire',
    baseStats: { offset: 0x1feba8, entrySize: 28, count: 387, verify: [{ index: 1, rel: 0, value: 45 }], fields: GEN3_BASE_FIELDS },
    moves: { offset: 0x1fb0bc, entrySize: 12, count: 354, fields: GEN3_MOVES }
  },
  emerald: {
    id: 'emerald', gen: 3, name: 'Pokémon Emerald',
    baseStats: { offset: 0x3203cc, entrySize: 28, count: 387, verify: [{ index: 1, rel: 0, value: 45 }], fields: GEN3_BASE_FIELDS },
    moves: { offset: 0x31c898, entrySize: 12, count: 354, fields: GEN3_MOVES }
  },
  firered: {
    id: 'firered', gen: 3, name: 'Pokémon FireRed',
    baseStats: { offset: 0x254784, entrySize: 28, count: 387, verify: [{ index: 1, rel: 0, value: 45 }], fields: GEN3_BASE_FIELDS },
    moves: { offset: 0x250c04, entrySize: 12, count: 354, fields: GEN3_MOVES }
  },
  leafgreen: {
    id: 'leafgreen', gen: 3, name: 'Pokémon LeafGreen',
    baseStats: { offset: 0x254760, entrySize: 28, count: 387, verify: [{ index: 1, rel: 0, value: 45 }], fields: GEN3_BASE_FIELDS },
    moves: { offset: 0x250be0, entrySize: 12, count: 354, fields: GEN3_MOVES }
  }
}

// ---- 招式表动态扫描（用于数据被搬移的汉化/魔改版） ----

/**
 * Gen2 招式表签名：
 *   Pound (id1):  anim=01 effect=00 power=0x28 type=00 acc=0xFF pp=0x23 chance=00
 *   KarateChop(2): anim=02 effect=00 power=0x32 type=01 acc=0xFF pp=0x19 chance=00
 * 已在标准银与 Tom_C 汉化银实测。
 */
const POUND_SIG = Buffer.from('01002800ff2300', 'hex')
const KARATE_SIG = Buffer.from('02003201ff1900', 'hex')

export function resolveMovesTable(
  rom: { readBytes: (o: number, l: number) => Buffer; size: number }
): number | null {
  const data = rom.readBytes(0x4000, rom.size - 0x4000)
  for (let i = 0; i <= data.length - POUND_SIG.length - 7; i++) {
    if (data[i] !== POUND_SIG[0]) continue
    if (!data.subarray(i, i + POUND_SIG.length).equals(POUND_SIG)) continue
    if (!data.subarray(i + 7, i + 7 + KARATE_SIG.length).equals(KARATE_SIG)) continue
    const off = 0x4000 + i
    // 再抽验第 3 条 Double Slap: anim=03 effect=1d power=0x0f type=00 acc=0xd8 pp=0x0a chance=00
    const third = rom.readBytes(off + 14, 7)
    if (third[0] === 0x03 && third[2] === 0x0f && third[4] === 0xd8 && third[5] === 0x0a) {
      return off
    }
  }
  return null
}

/**
 * Gen1 招式表签名（pokered moves：6 字节/条目 anim,effect,power,type,acc,pp）：
 *   Pound(1):    01 00 28 00 ff 23
 *   KarateChop(2): 02 00 32 00 ff 19（Gen1 卡拉乔普=一般属性）
 *   DoubleSlap(3): 03 1d 0f 00 d8 0a
 * 日版红绿布局不同（moves 跟着 bank 14），多命中时取离 baseStats 最近的。
 */
export function resolveMovesTableGen1(
  rom: { readBytes: (o: number, l: number) => Buffer; size: number },
  baseOffset = 0x383de
): number | null {
  const data = rom.readBytes(0x4000, rom.size - 0x4000)
  const hits: number[] = []
  for (let i = 0; i <= data.length - 20; i++) {
    if (data[i] !== 0x01) continue
    if (!data.subarray(i, i + 6).equals(Buffer.from('01002800ff23', 'hex'))) continue
    if (!data.subarray(i + 6, i + 12).equals(Buffer.from('02003200ff19', 'hex'))) continue
    if (!data.subarray(i + 12, i + 18).equals(Buffer.from('031d0f00d80a', 'hex'))) continue
    hits.push(0x4000 + i)
    i += 18
  }
  if (hits.length === 0) return null
  return hits.sort((a, b) => Math.abs(a - baseOffset) - Math.abs(b - baseOffset))[0]
}

// ---- 表读写引擎 ----

export interface SpeciesEntry {
  index: number
  fileOffset: number
  values: Record<string, number>
}

export function readSpeciesTable(rom: Rom, profile: BaseStatsProfile): SpeciesEntry[] {
  const firstId = profile.firstId ?? 0
  const out: SpeciesEntry[] = []
  for (let i = 0; i < profile.count; i++) {
    const id = firstId + i
    const fileOffset = profile.overrides?.[id] ?? profile.offset + i * profile.entrySize
    if (fileOffset < 0 || fileOffset + profile.entrySize > rom.size) continue
    const values: Record<string, number> = {}
    for (const f of profile.fields) {
      values[f.key] = f.kind === 'u16' ? rom.readU16(fileOffset + f.offset) : rom.readU8(fileOffset + f.offset)
    }
    out.push({ index: id, fileOffset, values })
  }
  return out
}

export function writeSpeciesField(rom: Rom, profile: BaseStatsProfile, id: number, key: string, value: number): void {
  const f = profile.fields.find((x) => x.key === key)
  if (!f) throw new Error(`未知字段: ${key}`)
  const firstId = profile.firstId ?? 0
  const fileOffset = profile.overrides?.[id] ?? profile.offset + (id - firstId) * profile.entrySize
  if (f.kind === 'u16') rom.writeU16(fileOffset + f.offset, value)
  else rom.writeU8(fileOffset + f.offset, value)
}

export interface MoveEntry {
  index: number
  fileOffset: number
  values: Record<string, number>
}

export function readMovesTable(rom: Rom, profile: MovesProfile): MoveEntry[] {
  const firstId = profile.firstId ?? 0
  const out: MoveEntry[] = []
  for (let i = 0; i < profile.count; i++) {
    const id = firstId + i
    const fileOffset = profile.offset + i * profile.entrySize
    if (fileOffset < 0 || fileOffset + profile.entrySize > rom.size) continue
    const values: Record<string, number> = {}
    for (const f of profile.fields) {
      values[f.key] = f.kind === 'u16' ? rom.readU16(fileOffset + f.offset) : rom.readU8(fileOffset + f.offset)
    }
    out.push({ index: id, fileOffset, values })
  }
  return out
}

export function writeMoveField(rom: Rom, profile: MovesProfile, id: number, key: string, value: number): void {
  const f = profile.fields.find((x) => x.key === key)
  if (!f) throw new Error(`未知字段: ${key}`)
  const firstId = profile.firstId ?? 0
  const fileOffset = profile.offset + (id - firstId) * profile.entrySize
  if (f.kind === 'u16') rom.writeU16(fileOffset + f.offset, value)
  else rom.writeU8(fileOffset + f.offset, value)
}

/** 校验 profile 是否与 ROM 匹配 */
export function verifyProfile(rom: Rom, profile: GameProfile): boolean {
  const checks: Array<[TableProfile, number]> = []
  checks.push([profile.baseStats, profile.baseStats.entrySize])
  if (profile.moves) checks.push([profile.moves, profile.moves.entrySize])
  for (const [table, es] of checks) {
    for (const v of table.verify ?? []) {
      const firstId = table.firstId ?? 0
      const off = table.offset + (v.index - firstId) * es + v.rel
      if (rom.readU8(off) !== v.value) return false
    }
  }
  return true
}
