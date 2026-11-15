/**
 * ROM 平台与游戏识别
 */
import type { Platform } from './rom'

export interface RomHeader {
  platform: Platform
  title: string
  /** GBA game code / GB 附加 game id */
  gameCode?: string
  cgbFlag?: number
  cartType?: number
  romSize: number
  valid: boolean
}

// ---- 版本（语言/地区）检测 ----

/**
 * 已知 GB 版宝可梦 game code（0x13F-0x142，4 字符）→ 版本说明
 * 来源与可信度：
 *  - AAUE/AAXE/BYTE：pret 官方 Makefile（AAUE = No-Intro "Gold Version (USA, Europe)"，欧美共用英文版）
 *  - AAUD/AAUF/AAUI/AAUS/AAXO/AAPS：德/法/意/西独立本地化卡带（Gekkio 卡带数据库 + 零售盒编码，已核实）
 *  - AAUP：金·欧/澳英文再版（DMG-AAUP-EUR / DMG-AAUP-AUS，已核实）
 *  - BXTJ：水晶日版（No-Intro CGB-BXTJ-0，已核实）
 *  - BYTF：水晶欧版（单一来源，待进一步核实）
 *  - AAXI/AAXF/AAUJ/AAXJ：银意/银法/日版金银（按编码规律推断/社区通行，未官方核实）
 */
const KNOWN_GB_IDS: Record<string, string> = {
  AAUE: '金 · 美版/欧版英文（No-Intro: Gold Version (USA, Europe)）',
  AAXE: '银 · 美版/欧版英文（同上）',
  AAUD: '金 · 德文版（Goldene Edition，DMG-AAUD-NOE）',
  AAUF: '金 · 法文版（Version Or，DMG-AAUF）',
  AAUI: '金 · 意文版（Versione Oro，DMG-AAUI-ITA）',
  AAUS: '金 · 西文版（Edición Oro，DMG-AAUS-ESP）',
  AAUP: '金 · 欧/澳英文再版 2001（DMG-AAUP-EUR/AUS）',
  AAXO: '银 · 德文版（Silberne Edition，DMG-AAXO-NOE）',
  AAPS: '银 · 西文版（Edición Plata，DMG-AAPS-ESP）',
  AAUK: '金 · 韩文版（CGB-AAUK-KOR，GameFAQs 核实，大宇发行 2002）',
  AAXK: '银 · 韩文版（CGB-AAXK-KOR，GameFAQs 韩国条目；Tom_C 汉化银的头部即此码）',
  BYTE: '水晶 · 美版（CGB-BYTE）',
  BYTF: '水晶 · 欧版（CGB-BYTF，五语言选择；单一来源待核实）',
  BXTJ: '水晶 · 日版（CGB-BXTJ-0）',
  AAXI: '银 · 意文版（按编码规律推断，未核实）',
  AAXF: '银 · 法文版（按编码规律推断，未核实）',
  AAUJ: '金 · 日版（社区通行编码，未官方核实）',
  AAXJ: '银 · 日版（社区通行编码，未官方核实）'
}

const CART_TYPES: Record<number, string> = {
  0: '纯 ROM', 1: 'MBC1', 2: 'MBC1+RAM', 3: 'MBC1+RAM+电池', 5: 'MBC2', 6: 'MBC2+电池',
  8: 'ROM+RAM', 9: 'ROM+RAM+电池', 0x10: 'MBC3+时钟+RAM', 0x11: 'MBC3+时钟+RAM+电池',
  0x12: 'MBC3+RAM', 0x13: 'MBC3+RAM+电池', 0x19: 'MBC5', 0x1a: 'MBC5+RAM', 0x1b: 'MBC5+RAM+电池',
  0x1c: 'MBC5+RUMBLE', 0x1d: 'MBC5+RUMBLE+RAM', 0x1e: 'MBC5+RUMBLE+RAM+电池'
}

const CGB_FLAGS: Record<number, string> = {
  0x80: 'GB 兼容（支持 GBC 增强）',
  0xc0: '仅 GBC'
}

export interface VersionInfo {
  /** game code 4 字符 */
  id: string
  /** 判定结果 */
  verdict: string
  /** 判定可信度 */
  confidence: '确定' | '疑似' | '未知'
  isJP: boolean
  isCrystal: boolean
  cartTypeText: string
  cgbText: string
  headerChecksumOk: boolean
  globalChecksum: string
}

export function detectVersion(data: Buffer, h: RomHeader): VersionInfo {
  // game code 位置探测：金银标题 11 字符（code 在 0x13F-0x142），
  // 水晶标题 PM_CRYSTAL 仅 10 字符（code 在 0x13E-0x141）
  const idA = data.subarray(0x13f, 0x143).toString('latin1')
  const idB = data.subarray(0x13e, 0x142).toString('latin1')
  const id = KNOWN_GB_IDS[idA] ? idA : KNOWN_GB_IDS[idB] ? idB : idA
  const isJP = data[0x142] === 0x4a || data[0x141] === 0x4a // 尾字节 'J' → 日版
  const isCrystal = h.title.startsWith('PM_CRYSTAL') || id === 'BYTE' || id === 'BXTJ'
  let verdict = ''
  let confidence: VersionInfo['confidence'] = '未知'
  const known = KNOWN_GB_IDS[id]
  if (known) {
    verdict = known
    confidence = known.includes('未官方核实') ? '疑似' : '确定'
  } else if (isCrystal) {
    verdict = '水晶 · 改版/汉化版（title 为 PM_CRYSTAL，但 game code 非标准，基于国际版或日版修改）'
    confidence = '疑似'
  } else if (isJP) {
    verdict = '疑似日版（game code 尾字节为 J，但非标准 AAUJ/AAXJ 编码）'
    confidence = '疑似'
  } else if (h.valid || h.title.startsWith('POKEMON') || h.title.startsWith('PM_')) {
    verdict = '疑似国际版（美/欧，英文）——头部可能经过改版/汉化改写，非标准编码'
    confidence = '疑似'
  } else {
    verdict = '未知版本（头部被改写，常见于汉化版/魔改版）'
    confidence = '未知'
  }
  // 头部校验和
  let sum = 0
  for (let i = 0x134; i <= 0x14c; i++) sum = (sum + data[i]) & 0xff
  const headerChecksumOk = ((0 - (sum + 25)) & 0xff) === data[0x14d]
  const globalChecksum = (data[0x14e] << 8) | data[0x14f]
  return {
    id: id.trim() || '(空)',
    verdict,
    confidence,
    isJP,
    isCrystal,
    cartTypeText: CART_TYPES[h.cartType ?? -1] ?? `未知(0x${(h.cartType ?? 0).toString(16)})`,
    cgbText: h.cgbFlag !== undefined ? (CGB_FLAGS[h.cgbFlag] ?? '纯 GB（不支持 GBC 增强）') : '',
    headerChecksumOk,
    globalChecksum: '0x' + globalChecksum.toString(16).padStart(4, '0')
  }
}

/** GB Nintendo logo 前 8 字节（完整 48 字节，取前缀做校验足够） */
const GB_LOGO_PREFIX = Buffer.from('ceed6666cc0d000b03730083000c000d0008111f8889000e', 'hex') // 32 字节

export function parseHeader(data: Buffer): RomHeader {
  const isGba = data.length >= 0xc0 && data[0xb2] === 0x96
  if (isGba) {
    const title = data.subarray(0xa0, 0xac).toString('latin1')
    const gameCode = data.subarray(0xac, 0xb0).toString('latin1')
    let sum = 0
    for (let i = 0xa0; i <= 0xbc; i++) sum = (sum + data[i]) & 0xff
    const valid = ((-(sum + 0x19)) & 0xff) === data[0xbd] && data.subarray(4, 0x9c).toString('hex').startsWith('24ffae5150993858')
    return { platform: 'gba', title, gameCode, romSize: data.length, valid }
  }
  const logoOk = data.length >= 0x134 && data.subarray(0x104, 0x124).equals(GB_LOGO_PREFIX)
  const title = data.length >= 0x134 ? data.subarray(0x134, 0x143).toString('latin1').trimEnd() : ''
  return {
    platform: 'gb',
    title,
    cgbFlag: data[0x143],
    cartType: data[0x147],
    romSize: data.length,
    valid: logoOk
  }
}

/** 已知游戏库：GB 按 title（含汉化版可能保留的原 title），GBA 按 game code */
export interface GameInfo {
  id: string
  gen: 1 | 2 | 3
  name: string
}

const GB_GAMES: Array<{ match: RegExp; info: GameInfo }> = [
  { match: /^POKEMON ?RED/i, info: { id: 'red', gen: 1, name: '精灵宝可梦 红' } },
  { match: /^POKEMON ?BLUE/i, info: { id: 'blue', gen: 1, name: '精灵宝可梦 蓝' } },
  { match: /^POKEMON ?YELLOW|^POKEMON_YEL|^POKEMON ?YEL/i, info: { id: 'yellow', gen: 1, name: '精灵宝可梦 皮卡丘(黄)' } },
  { match: /^POKEMON ?GLD|^POKEMON ?GOLD|^POKEMON_GLD/i, info: { id: 'gold', gen: 2, name: '精灵宝可梦 金' } },
  { match: /^POKEMON ?SLV|^POKEMON ?SILVER|^POKEMON_SLV/i, info: { id: 'silver', gen: 2, name: '精灵宝可梦 银' } },
  { match: /^PM_CRYSTAL|^POKEMON ?CRYSTAL/i, info: { id: 'crystal', gen: 2, name: '精灵宝可梦 水晶' } }
]

const GBA_GAMES: Record<string, GameInfo> = {
  AXVE: { id: 'ruby', gen: 3, name: '精灵宝可梦 红宝石' },
  AXPE: { id: 'sapphire', gen: 3, name: '精灵宝可梦 蓝宝石' },
  BPEE: { id: 'emerald', gen: 3, name: '精灵宝可梦 绿宝石' },
  BPRE: { id: 'firered', gen: 3, name: '精灵宝可梦 火红' },
  BPGE: { id: 'leafgreen', gen: 3, name: '精灵宝可梦 叶绿' }
}

export function identifyGame(h: RomHeader): GameInfo | null {
  if (h.platform === 'gba') {
    return GBA_GAMES[h.gameCode?.trim() ?? ''] ?? null
  }
  for (const { match, info } of GB_GAMES) {
    if (match.test(h.title)) return info
  }
  return null
}

// ---- 汉化/改版兜底：按 Bulbasaur 字节签名定位世代与表偏移 ----

// Gen1: dex=01 HP=45 Atk=49 Def=49 Spd=45 Spc=65 type1=草(0x16) type2=毒(0x03) catch=45 baseExp=64
const SIG_GEN1 = Buffer.from('012d31312d4116032d40', 'hex')
// Gen2: dex=01 HP=45 Atk=49 Def=49 Spd=45 SpA=65 SpD=65 type1=草(0x16) type2=毒(0x03) catch=45 baseExp=64
const SIG_GEN2 = Buffer.from('012d31312d414116032d40', 'hex')
// Gen3 FRLG/RS/E: 28 字节条目: HP=45 Atk=49 Def=49 Spd=45 SpA=65 SpD=65 type1=草(0x0c) type2=毒(0x03) catch=45
const SIG_GEN3 = Buffer.from('2d31312d41410c032d', 'hex')

export interface ScanResult {
  gen: 1 | 2 | 3
  /** Bulbasaur 条目文件偏移 → 表首 = 该值 - entrySize */
  bulbasaurOffset: number
}

export function scanForGen(data: Buffer): ScanResult | null {
  function find(sig: Buffer): number | null {
    for (let i = 0x4000; i <= data.length - sig.length; i++) {
      if (data[i] === sig[0] && data.subarray(i, i + sig.length).equals(sig)) return i
    }
    return null
  }
  const g2 = find(SIG_GEN2)
  if (g2 !== null) return { gen: 2, bulbasaurOffset: g2 }
  const g3 = find(SIG_GEN3)
  if (g3 !== null) return { gen: 3, bulbasaurOffset: g3 - 6 } // SIG_GEN3 从 HP 字段开始
  // Gen1：日版 1MB ROM 里数据可能有两份拷贝，引擎引用 bank 14（0x38000 起）那份
  const g1 = (() => {
    const hits: number[] = []
    for (let i = 0x4000; i <= data.length - SIG_GEN1.length; i++) {
      if (data[i] === SIG_GEN1[0] && data.subarray(i, i + SIG_GEN1.length).equals(SIG_GEN1)) hits.push(i)
    }
    if (hits.length === 0) return null
    const preferBank14 = hits.find((h) => h >= 0x38000 && h < 0x3c000)
    return preferBank14 ?? hits[0]
  })()
  if (g1 !== null && g1 !== undefined) return { gen: 1, bulbasaurOffset: g1 }
  // 兜底：结构特征扫描（数值被改的改版也能找到）
  const g2loose = scanGen2TableLoose(data)
  if (g2loose !== null) return { gen: 2, bulbasaurOffset: g2loose }
  return null
}

/**
 * Gen2 BaseStats 结构特征扫描：每条目 32 字节，
 * +0x0E 恒=100(0x64)，+0x10 恒=5，+0x12..0x15 恒=00000000，dex 字节 = 递增 id。
 * 对数值被修改的汉化/改版 ROM 依然有效。返回 Bulbasaur（id=1）条目偏移。
 */
export function scanGen2TableLoose(data: Buffer): number | null {
  const COUNT = 40
  for (let O = 0x4000; O <= data.length - COUNT * 32; O++) {
    let ok = 0
    for (let i = 0; i < COUNT; i++) {
      const e = O + i * 32
      if (
        data[e + 0x0e] === 0x64 && data[e + 0x10] === 0x05 &&
        data[e + 0x12] === 0 && data[e + 0x13] === 0 && data[e + 0x14] === 0 && data[e + 0x15] === 0 &&
        data[e] === i + 1
      ) ok++
    }
    if (ok >= COUNT - 2) return O
  }
  return null
}
