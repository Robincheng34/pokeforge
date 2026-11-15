/**
 * Gen2 存档（.sav）队伍编辑
 * 布局（pret/pokecrystal SRAM 符号，金银水晶通用）：
 *   SRAM bank1 → 文件偏移 0x0000-0x1FFF
 *   sPartyCount = 0x0865（1 字节）
 *   队伍宝可梦结构 48 字节 × 6 @ 0x0866 起：
 *     +0 species  +1 item  +2..5 moves  +6..7 OTID  +8..10 exp
 *     +11..20 stat exp  +21..22 DVs  +23..26 PP  +27 happiness  +28 pokerus
 *     +29..30 caught data  +31 level  +32 status  +33 unused  +34..35 current HP
 *     +36..37 maxHP  +38..47 stats
 *   校验和：sChecksum @ 0xAD0D（LE16）= sGameData(0x0009-0xB82) 逐字节 16 位和
 * 注意：改 species 不会自动重算六项能力值（游戏会在升级/治愈时部分重算），改完进游戏看 PC/战斗验证
 */
import type { Rom } from './rom'

export interface SavPartyMon {
  off: number
  species: number
  item: number
  moves: number[]
  level: number
  curHp: number
  maxHp: number
  pokerus: number
  dvs: { atk: number; def: number; spd: number; spc: number }
  shiny: boolean
  statExp: { hp: number; atk: number; def: number; spd: number; spc: number }
}

export interface SavInfo {
  ok: boolean
  reason?: string
  partyCount: number
  mons: SavPartyMon[]
}

export function openSav(rom: Rom): SavInfo {
  const d = rom.data
  if (d.length < 0x2000) return { ok: false, reason: '文件太小，不是 Gen2 存档', partyCount: 0, mons: [] }
  const pc = d[0x865]
  if (pc > 6) return { ok: false, reason: '队伍数量字段异常（' + pc + '），可能不是金/银/水晶存档或未开过档', partyCount: pc, mons: [] }
  const mons: SavPartyMon[] = []
  for (let i = 0; i < pc; i++) {
    const off = 0x866 + i * 48
    const dv0 = d[off + 21]
    const dv1 = d[off + 22]
    mons.push({
      off,
      species: d[off],
      item: d[off + 1],
      moves: [d[off + 2], d[off + 3], d[off + 4], d[off + 5]],
      level: d[off + 31],
      curHp: d[off + 34] | (d[off + 35] << 8),
      maxHp: d[off + 36] | (d[off + 37] << 8),
      pokerus: d[off + 28],
      dvs: { atk: (dv0 >> 4) & 0xf, def: dv0 & 0xf, spd: (dv1 >> 4) & 0xf, spc: dv1 & 0xf },
      shiny: dv0 === 0xaa && dv1 === 0xaa,
      statExp: {
        hp: d[off + 11] | (d[off + 12] << 8),
        atk: d[off + 13] | (d[off + 14] << 8),
        def: d[off + 15] | (d[off + 16] << 8),
        spd: d[off + 17] | (d[off + 18] << 8),
        spc: d[off + 19] | (d[off + 20] << 8)
      }
    })
  }
  return { ok: true, partyCount: pc, mons }
}

/** 写入队伍宝可梦的病毒状态（0x00=无 / 0x01=感染毒株1） */
export function setPokerus(rom: Rom, monOff: number, infected: boolean): void {
  if (infected) rom.writeU8(monOff + 28, 0x01)
  else rom.writeU8(monOff + 28, 0x00)
}

/** 写入闪光状态（Gen2: 攻/防/速/特 DV = 10/10/10/10） */
export function setShiny(rom: Rom, monOff: number, shiny: boolean): void {
  if (shiny) {
    rom.writeU8(monOff + 21, 0xaa)
    rom.writeU8(monOff + 22, 0xaa)
  }
}

/** 写入单项努力值（stat exp，2 字节小端） */
export function writeStatExp(rom: Rom, monOff: number, index: number, value: number): void {
  const v = Math.max(0, Math.min(65535, value))
  rom.writeU8(monOff + 11 + index * 2, v & 0xff)
  rom.writeU8(monOff + 12 + index * 2, v >> 8)
}

/** 代币读取/写入（BCD 2 字节，最大 9999） */
export function getCoins(rom: Rom): number {
  return bcdByte(rom.readU8(0xa72c)) * 100 + bcdByte(rom.readU8(0xa72d))
}
export function setCoins(rom: Rom, value: number): void {
  const v = Math.max(0, Math.min(9999, value))
  const t = v.toString().padStart(4, '0')
  rom.writeU8(0xa72c, (parseInt(t[0], 10) << 4) | parseInt(t[1], 10))
  rom.writeU8(0xa72d, (parseInt(t[2], 10) << 4) | parseInt(t[3], 10))
}

// ---- 神兽位置直达（写存档当前位置 PlayerData3 copy: wMapGroup @0xA845 / wMapNumber @0xA846 / wYCoord @0xA847 / wXCoord @0xA848）----
export interface LegendaryLocation {
  name: string
  pokemon: string
  group: number
  map: number
  y: number
  x: number
}

export const LEGENDARY_LOCATIONS: LegendaryLocation[] = [
  { name: '漩涡岛 · 洛奇亚所在层', pokemon: '洛奇亚', group: 3, map: 65, y: 9, x: 15 },
  { name: '铃铛塔顶层', pokemon: '凤王', group: 15, map: 12, y: 9, x: 8 },
  { name: '白银山 · 内部深处', pokemon: 'RED 对战', group: 3, map: 68, y: 14, x: 12 }
]

export function teleportTo(rom: Rom, group: number, map: number, y: number, x: number): void {
  rom.writeU8(0xa845, group)
  rom.writeU8(0xa846, map)
  rom.writeU8(0xa847, y)
  rom.writeU8(0xa848, x)
}

export function fixSavChecksum(rom: Rom): void {
  const d = rom.data
  let sum = 0
  for (let i = 0x9; i <= 0xb82; i++) sum = (sum + d[i]) & 0xffff
  rom.writeU8(0xad0d, sum & 0xff)
  rom.writeU8(0xad0e, sum >> 8)
}

// ---- PC 盒子 ----
// SRAM bank 2-4（文件 0x2000 起），每盒 0x450 字节：
//   +0 数量  +1..20 物种列表(20B)  +0x16 起 20 个 32 字节结构
// 盒子1-14：文件偏移 = 0x2000 + (k-1)*0x450
const BOX_STRIDE = 0x450
const BOX_BASE = 0x2000
export const BOX_COUNT = 14

export function readBox(rom: Rom, box: number): Array<{ species: number; level: number; off: number; struct: Buffer }> {
  const d = rom.data
  const base = BOX_BASE + (box - 1) * BOX_STRIDE
  const count = d[base]
  const out: Array<{ species: number; level: number; off: number; struct: Buffer }> = []
  for (let i = 0; i < Math.min(count, 20); i++) {
    const off = base + 0x16 + i * 32
    out.push({
      species: d[base + 1 + i],
      level: d[off + 31],
      off,
      struct: Buffer.from(d.subarray(off, off + 32))
    })
  }
  return out
}

/** 按（图鉴编号）排序盒子内容：蛋（0xFD）排最后 */
export function sortBoxByDex(rom: Rom, box: number): number {
  const d = rom.data
  const base = BOX_BASE + (box - 1) * BOX_STRIDE
  const count = Math.min(d[base], 20)
  if (count < 2) return 0
  const mons = []
  for (let i = 0; i < count; i++) {
    mons.push({
      species: d[base + 1 + i],
      struct: Buffer.from(d.subarray(base + 0x16 + i * 32, base + 0x16 + i * 32 + 32))
    })
  }
  // 蛋（species>=0xFD）排最后，其余按图鉴号升序
  mons.sort((a, b) => {
    const ea = a.species >= 0xfd ? 1 : 0
    const eb = b.species >= 0xfd ? 1 : 0
    if (ea !== eb) return ea - eb
    return a.species - b.species
  })
  for (let i = 0; i < count; i++) {
    d[base + 1 + i] = mons[i].species
    mons[i].struct.copy(d, base + 0x16 + i * 32)
  }
  return count
}

export function sortAllBoxes(rom: Rom): number {
  let total = 0
  for (let k = 1; k <= BOX_COUNT; k++) total += sortBoxByDex(rom, k) ? 1 : 0
  return total
}


// ---- 人物信息卡 / 背包 / 徽章（PlayerData3 副本 @0xA723，结构经 sCurMapData@0xA833 交叉验证）----
// PlayerData3 copy @0xA723: +0 StatusFlags +1 StatusFlags2 +2 Money(3B BCD) +5 MomsMoney +8 MomSave +9 Coins(2B)
// +11 JohtoBadges(1B) +12 KantoBadges(1B) +13 TMsHMs(57B) +70 NumItems +71 Items(20×2) +112 NumKeyItems
// +113 KeyItems(25×1) +139 NumBalls +140 Balls(12×2) +165 NumPCItems +166 PCItems(50×2)
const PD3 = 0xa723
export const BADGE_NAMES = {
  johto: ['翼羽', '昆虫', '普通', '幻影', '涛汐', '钢铁', '冰川', '升腾'],
  kanto: ['灰色', '蓝色', '橙色', '彩虹', '灵魂', '粉色', '火山', '大地']
}

/** Gen2 字符解码（名字区） */
export function decodeGen2Name(rom: Rom, off: number, len: number): string {
  const d = rom.data
  let out = ''
  for (let i = 0; i < len; i++) {
    const b = d[off + i]
    if (b === 0x50 || b === 0x00) break // 终止符
    if (b >= 0x80 && b <= 0x99) out += String.fromCharCode(65 + (b - 0x80))
    else if (b >= 0xa0 && b <= 0xb9) out += String.fromCharCode(97 + (b - 0xa0))
    else if (b >= 0xf6 && b <= 0xff) out += String.fromCharCode(48 + (b - 0xf6))
    else if (b === 0x7f) out += ' '
    else out += ''
  }
  return out.trimEnd()
}

/** Gen2 字符编码（仅支持字母/数字/空格，汉字需字库映射暂不支持） */
export function encodeGen2Name(text: string): number[] | null {
  const out: number[] = []
  for (const ch of text) {
    const c = ch.charCodeAt(0)
    if (c >= 65 && c <= 90) out.push(0x80 + c - 65)
    else if (c >= 97 && c <= 122) out.push(0xa0 + c - 97)
    else if (c >= 48 && c <= 57) out.push(0xf6 + c - 48)
    else if (ch === ' ') out.push(0x7f)
    else return null // 不支持的字符
  }
  out.push(0x50)
  return out
}

export function getPlayerInfo(rom: Rom) {
  const nameOff = 0xa00b // PlayerData1 copy +2
  return {
    name: decodeGen2Name(rom, nameOff, 11),
    nameOff,
    money: bcdToNumber(rom.data.subarray(0xa725, 0xa728)),
    moneyOff: 0xa725
  }
}

/** 金钱写入（BCD 3 字节，最大 999999） */
export function setMoney(rom: Rom, value: number): void {
  const t = Math.max(0, Math.min(999999, value)).toString().padStart(6, '0')
  const bytes = [
    parseInt(t.slice(0, 2), 10),
    (parseInt(t.slice(2, 3), 10) << 4) | parseInt(t.slice(3, 4), 10),
    (parseInt(t.slice(4, 5), 10) << 4) | parseInt(t.slice(5, 6), 10)
  ]
  bytes.forEach((b, k) => rom.writeU8(0xa725 + k, b))
}

/** 玩家名写入（仅英文字母/数字/空格） */
export function setPlayerName(rom: Rom, text: string): boolean {
  const enc = encodeGen2Name(text)
  if (enc === null) return false
  enc.forEach((b, k) => rom.writeU8(0xa00b + k, b))
  return true
}

function bcdToNumber(bytes: Buffer): number {
  return bytes[0] * 10000 + bcdByte(bytes[1]) * 100 + bcdByte(bytes[2])
}
function bcdByte(b: number): number {
  return ((b >> 4) & 0xf) * 10 + (b & 0xf)
}
function numberToBcdBytes(value: number): number[] {
  const s = Math.max(0, Math.min(999999, value)).toString().padStart(6, '0')
  return [parseInt(s.slice(0, 2), 10), bcdByte2(s.slice(2, 4)), bcdByte2(s.slice(4, 6))]
}
function bcdByte2(pair: string): number {
  return (parseInt(pair[0], 10) << 4) | parseInt(pair[1], 10)
}

/** 徽章读写（PlayerData3 copy +11/+12） */
export function getBadges(rom: Rom): { johto: boolean[]; kanto: boolean[] } {
  const j = rom.readU8(0xa72e)
  const k = rom.readU8(0xa72f)
  return {
    johto: Array.from({ length: 8 }, (_, i) => ((j >> i) & 1) === 1),
    kanto: Array.from({ length: 8 }, (_, i) => ((k >> i) & 1) === 1)
  }
}
export function toggleBadge(rom: Rom, region: 'johto' | 'kanto', index: number): void {
  const off = region === 'johto' ? 0xa72e : 0xa72f
  const cur = rom.readU8(off)
  rom.writeU8(off, cur ^ (1 << index))
}

/** 背包（4 个口袋，PlayerData3 copy 内） */
export interface BagSlot { item: number; qty: number; itemOff: number; qtyOff: number }
export interface BagPocket { name: string; count: number; slots: BagSlot[]; max: number }

export function readBag(rom: Rom): BagPocket[] {
  const pockets: Array<{ name: string; countOff: number; itemsOff: number; max: number; tmhm?: boolean }> = [
    { name: '道具口袋', countOff: 0xa769, itemsOff: 0xa76a, max: 20 },
    { name: '重要物品口袋', countOff: 0xa793, itemsOff: 0xa794, max: 25 },
    { name: '精灵球口袋', countOff: 0xa7ae, itemsOff: 0xa7af, max: 12 }
  ]
  return pockets.map((p) => {
    const count = Math.min(rom.readU8(p.countOff), p.max)
    const slots: BagSlot[] = []
    for (let i = 0; i < count; i++) {
      slots.push({ item: rom.readU8(p.itemsOff + i * 2), qty: rom.readU8(p.itemsOff + i * 2 + 1), itemOff: p.itemsOff + i * 2, qtyOff: p.itemsOff + i * 2 + 1 })
    }
    return { name: p.name, count, slots, max: p.max }
  })
}

export function writeBagItem(rom: Rom, itemOff: number, qtyOff: number, item: number, qty: number): void {
  rom.writeU8(itemOff, item)
  rom.writeU8(qtyOff, Math.max(1, Math.min(99, qty)))
}
