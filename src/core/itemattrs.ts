/**
 * Gen2 道具属性表（ItemAttributes，7 字节/条目，价格=16位小端二进制）：
 *   +0..1 价格  +2 持有效果  +3 参数  +4 权限位(0x40=不可选/0x80=不可丢弃)
 *   +5 口袋(0=道具 1=球 2=重要物品 3=招式机)  +6 菜单 nibbles（只读展示）
 * 签名：MASTER_BALL + ULTRA_BALL 前两条目（14 字节），金/银/水晶/Tom_C/韩版全部实测命中。
 * 表大小：256 条（item id 0x00-0xFF）。
 */
import { romMemo } from './cache'
import gen2Zh from './gen2-items-zh.json'
import gen2Functions from './gen2-item-functions.json'

const ITEM_ZH = gen2Zh as Record<number, string>


export const POCKET_OPTIONS: Record<number, string> = {
  1: '道具口袋',
  2: '重要物品口袋',
  3: '精灵球口袋',
  4: '招式机口袋'
}

export function itemDisplayName(id: number): string {
  const zh = ITEM_ZH[id]
  if (zh) return `#${id} ${zh}`
  if (id >= 0xbf && id <= 0xf3) return `招式机 TM${id - 0xbe}`
  if (id >= 0xf4 && id <= 0xfa) return `秘传机 HM${id - 0xf3}`
  if (id === 0xfb) return 'GS球'
  return `#${id}`
}

/** 持有效果中文名（编号已用亮粉 0x4D / 护身金币 0x4C / 焦点带 0x4F / 剩饭 0x03 / 金属粉 0x2A 实测校准） */
export const HELD_EFFECT_ZH: Record<number, string> = {
  0x00: '无特殊效果',
  0x01: '树果（受击回复 10 HP）',
  0x03: '剩饭（每回合回复 1/16 HP）',
  0x06: '受击后回复 PP',
  0x08: '驱邪符（降低野生遇敌率）',
  0x0a: '受击后治愈中毒',
  0x0b: '受击后治愈冰冻',
  0x0c: '受击后治愈灼伤',
  0x0d: '受击后治愈睡眠',
  0x0e: '受击后治愈麻痹',
  0x0f: '受击后治愈全部异常',
  0x10: '受击后治愈混乱',
  0x1f: '受击后提升攻击',
  0x20: '受击后提升防御',
  0x21: '受击后提升速度',
  0x22: '受击后提升特攻',
  0x23: '受击后提升特防',
  0x24: '受击后提升命中',
  0x25: '受击后提升闪避',
  0x2a: '金属粉（百变怪防御翻倍）',
  0x32: '一般系招式威力 +20%',
  0x33: '格斗系 +20%', 0x34: '飞行系 +20%', 0x35: '毒系 +20%',
  0x36: '地面系 +20%', 0x37: '岩石系 +20%', 0x38: '虫系 +20%', 0x39: '幽灵系 +20%',
  0x3a: '火系 +20%', 0x3b: '水系 +20%', 0x3c: '草系 +20%', 0x3d: '电系 +20%',
  0x3e: '超能力系 +20%', 0x3f: '冰系 +20%', 0x40: '龙系 +20%', 0x41: '恶系 +20%',
  0x42: '钢系 +20%',
  0x46: '受击后提高捕捉率',
  0x48: '必定从野生战斗逃走',
  0x49: '会心率提升',
  0x4a: '先制之爪（概率先制攻击）',
  0x4b: '攻击使目标畏缩',
  0x4c: '护身金币（奖金翻倍）',
  0x4d: '光粉（降低被命中率）',
  0x4f: '焦点带（1/10 HP 免死）'
}

export function heldEffectLabel(id: number): string {
  const zh = HELD_EFFECT_ZH[id]
  if (zh) return `0x${id.toString(16).padStart(2, '0')} ${zh}`
  return `0x${id.toString(16).padStart(2, '0')} 未使用`
}

/** 道具真实使用功能（Gen2 实际效果） */
export const ITEM_FUNCTIONS: Record<number, string> = gen2Functions as Record<number, string>

export interface ItemAttr {
  id: number
  off: number
  price: number
  heldEffect: number
  param: number
  permissions: number
  pocket: number
  help: number
}

function findItemAttrTableUncached(
  rom: { readU8: (o: number) => number; size: number }
): number | null {
  const sig = [0, 0, 0, 0, 0x40, 3, 6, 0xb0, 0x04, 0, 0, 0x40, 3, 6]
  const hits: number[] = []
  for (let i = 0x4000; i <= rom.size - sig.length; i++) {
    let ok = true
    for (let k = 0; k < sig.length; k++) {
      if (rom.readU8(i + k) !== sig[k]) { ok = false; break }
    }
    if (ok) hits.push(i)
  }
  // 校验：id18（伤药）条目应为 价格 300(0x012c) + 持有效果 0 + 口袋 1 —— 防止命中巧合位置
  for (const x of hits) {
    const pOff = x + 17 * 7
    if (rom.readU8(pOff) === 0x2c && rom.readU8(pOff + 1) === 0x01 && rom.readU8(pOff + 5) === 0x01) return x
  }
  return hits[0] ?? null
}

export function readItemAttr(rom: { readU8: (o: number) => number }, tableOffset: number, id: number): ItemAttr {
  const off = tableOffset + (id - 1) * 7
  return {
    id,
    off,
    price: rom.readU8(off) | (rom.readU8(off + 1) << 8),
    heldEffect: rom.readU8(off + 2),
    param: rom.readU8(off + 3),
    permissions: rom.readU8(off + 4),
    pocket: rom.readU8(off + 5),
    help: rom.readU8(off + 6)
  }
}

export function copyItemAttrs(
  rom: { readU8: (o: number) => number; writeU8: (o: number, v: number) => void },
  tableOffset: number,
  fromId: number,
  toId: number
): void {
  const src = tableOffset + (fromId - 1) * 7
  const dst = tableOffset + (toId - 1) * 7
  for (let k = 0; k < 7; k++) rom.writeU8(dst + k, rom.readU8(src + k))
}

export function writeItemAttrField(
  rom: { writeU8: (o: number, v: number) => void },
  id: number,
  tableOffset: number,
  field: 'price' | 'heldEffect' | 'param' | 'permissions' | 'pocket',
  value: number
): void {
  const off = tableOffset + (id - 1) * 7
  if (field === 'price') {
    rom.writeU8(off, value & 0xff)
    rom.writeU8(off + 1, (value >> 8) & 0xff)
  } else if (field === 'heldEffect') rom.writeU8(off + 2, value)
  else if (field === 'param') rom.writeU8(off + 3, value)
  else if (field === 'permissions') rom.writeU8(off + 4, value)
  else if (field === 'pocket') rom.writeU8(off + 5, value)
}

export function findItemAttrTable(rom: Parameters<typeof findItemAttrTableUncached>[0]) {
  return romMemo(rom, 'itemAttrTable', () => findItemAttrTableUncached(rom))
}


// ---- Gen1（红绿蓝黄）价格表：BCD3 × 83 项（pokered ItemPrices，值 = 价格×100）----
export interface Gen1PriceTable { offset: number }
const priceCache1 = new WeakMap<object, number | null>()

export function findItemPricesGen1(rom: { data: Buffer }): number | null {
  if (priceCache1.has(rom)) return priceCache1.get(rom)!
  const d = rom.data
  const sig = Buffer.from([0x12, 0x00, 0x00, 0x06, 0x00, 0x00, 0x02, 0x00, 0x00]) // 超级球1200/超级球600/精灵球200
  let off: number | null = null
  for (let i = 0x4000; i < d.length - 0x54 * 3; i++) {
    if (d[i] === 0x12 && d[i + 1] === 0x00 && d[i + 2] === 0x00 && d[i + 3] === 0x06 && d[i + 4] === 0x00 && d[i + 5] === 0x00 && d[i + 6] === 0x02 && d[i + 7] === 0x00 && d[i + 8] === 0x00) {
      off = i - 3 // 表首 = 大师球（0）
      break
    }
  }
  priceCache1.set(rom, off)
  return off
}

const bcd2 = (b: number) => (b >> 4) * 10 + (b & 15)

export function readGen1Price(rom: { data: Buffer }, tableOff: number, id: number): number {
  const o = tableOff + (id - 1) * 3
  return bcd2(rom.data[o]) * 100 + bcd2(rom.data[o + 1])
}

export function writeGen1Price(rom: { data: Buffer }, tableOff: number, id: number, price: number): void {
  const v = Math.max(0, Math.min(9999, Math.round(price)))
  const s = v.toString().padStart(4, '0')
  const o = tableOff + (id - 1) * 3
  rom.data[o] = (parseInt(s[0], 10) << 4) | parseInt(s[1], 10)
  rom.data[o + 1] = (parseInt(s[2], 10) << 4) | parseInt(s[3], 10)
  rom.data[o + 2] = 0
}
