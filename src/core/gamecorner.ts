/**
 * Gen2 游戏中心（投币游戏机，满金/枯叶道馆旁的游戏中心）：
 * - 卡片翻牌奖品（宝可梦 / 道具·招式机）与价格
 * - 代币兑换率（金钱 ↔ 代币）
 *
 * 脚本命令编码（pokegold scripting.asm 命令表）：
 *   checkcoins = 0x27 + 价格 LE16（低在前）
 *   takecoins  = 0x26 + 价格 LE16
 *   givecoins  = 0x25 + 数量 LE16
 *   takemoney  = 0x24 + 账户 + 3 字节 BCD 金额
 *   givepoke   = 0x2D + 物种 + 等级
 *   giveitem   = 0x1F + 道具 + 数量
 *
 * 奖品识别：givepoke/giveitem 紧跟 takecoins(0x26+LE16) 的脚本块；
 * 价格在 checkcoins 与 takecoins 两处，编辑时同步改。
 */
import type { Rom } from './rom'

export interface CornerPrize {
  kind: 'pokemon' | 'item'
  /** pokemon */
  species?: number
  level?: number
  spOff?: number
  lvOff?: number
  /** item */
  item?: number
  qty?: number
  itemOff?: number
  qtyOff?: number
  price: number
  /** checkcoins 价格低字节文件偏移（与 takecoins 各一处） */
  priceOffs: number[]
}

export interface ExchangeRate {
  /** 金钱 BCD 3 字节偏移（低字节在前? 金额按脚本字节序原样存储） */
  moneyOff: number
  moneyBytes: number[]
  /** 代币 LE16 低字节偏移 */
  coinsOff: number
  coins: number
}

const prizeCache = new WeakMap<object, CornerPrize[]>()
const rateCache = new WeakMap<object, ExchangeRate[]>()

export function findCornerPrizes(rom: Rom): CornerPrize[] {
  if (prizeCache.has(rom)) return prizeCache.get(rom)!
  const d = rom.data
  const out: CornerPrize[] = []
  for (let i = 0; i < d.length - 6; i++) {
    if (d[i] !== 0x26) continue
    const price = d[i + 1] | (d[i + 2] << 8)
    if (price <= 0 || price > 9999) continue
    const checks = findCheckCoinsPrice(rom, price, i)
    if (checks.length === 0) continue // 必须有配套的 checkcoins，排除巧合字节
    // 宝可梦奖品：givepoke(2D)+物种+等级，允许与 takecoins 间夹少量命令字节
    const gp = findBackward(d, i, 0x2d, (dd, j) => dd[j + 1] >= 1 && dd[j + 1] <= 252 && dd[j + 2] >= 2 && dd[j + 2] <= 100)
    if (gp >= 0) {
      out.push({
        kind: 'pokemon', species: d[gp + 1], level: d[gp + 2],
        spOff: gp + 1, lvOff: gp + 2, price,
        priceOffs: [i + 1, ...checks]
      })
      continue
    }
    // 道具奖品：giveitem(1F)+道具+数量
    const gi = findBackward(d, i, 0x1f, (dd, j) => dd[j + 1] >= 1 && dd[j + 2] === 1)
    if (gi >= 0) {
      out.push({
        kind: 'item', item: d[gi + 1], qty: d[gi + 2],
        itemOff: gi + 1, qtyOff: gi + 2, price,
        priceOffs: [i + 1, ...checks]
      })
    }
  }
  prizeCache.set(rom, out)
  return out
}

/** 在 takeOff 前向窗口内找最近的 opcode（附带参数校验），窗口 16 字节 */
function findBackward(d: Buffer, takeOff: number, op: number, ok: (dd: Buffer, j: number) => boolean): number {
  for (let j = takeOff - 3; j >= Math.max(0, takeOff - 16); j--) {
    if (d[j] === op && ok(d, j)) return j
  }
  return -1
}

/** 向前找相同价格的 checkcoins(0x27+LE16) */
function findCheckCoinsPrice(rom: Rom, price: number, takeOff: number): number[] {
  const d = rom.data
  const lo = price & 0xff, hi = price >> 8
  for (let k = takeOff - 1; k > Math.max(0, takeOff - 120); k--) {
    if (d[k] === 0x27 && d[k + 1] === lo && d[k + 2] === hi) {
      // 真奖品脚本的 checkcoins 后必跟 ifequal 0x02（HAVE_LESS），否则视为巧合字节
      if (d[k + 3] === 0x06 && d[k + 4] === 0x02) return [k + 1]
      return []
    }
  }
  return []
}

/** 写奖品价格（同步 checkcoins 与 takecoins 两处） */
export function writePrizePrice(rom: Rom, p: CornerPrize, price: number): void {
  const v = Math.max(1, Math.min(9999, price))
  const lo = v & 0xff, hi = v >> 8
  for (const off of p.priceOffs) {
    rom.writeU8(off, lo)
    rom.writeU8(off + 1, hi)
  }
}

/** 兑换率：takemoney(0x24)+BCD3 与 givecoins(0x25)+LE16 相邻的脚本块 */
export function findExchangeRates(rom: Rom): ExchangeRate[] {
  if (rateCache.has(rom)) return rateCache.get(rom)!
  const d = rom.data
  const out: ExchangeRate[] = []
  for (let i = 0; i < d.length - 14; i++) {
    if (d[i] !== 0x25) continue
    const coins = d[i + 1] | (d[i + 2] << 8)
    if (coins <= 0 || coins > 9999) continue
    // 前方 12 字节内找 takemoney(0x24)
    for (let k = i - 1; k > Math.max(0, i - 12); k--) {
      if (d[k] === 0x24) {
        out.push({ moneyOff: k + 2, moneyBytes: [d[k + 2], d[k + 3], d[k + 4]], coinsOff: i + 1, coins })
        break
      }
    }
  }
  rateCache.set(rom, out)
  return out
}

function bcd3ToNumber(b: number[]): number {
  return ((b[0] >> 4) & 0xf) * 100000 + (b[0] & 0xf) * 10000 + ((b[1] >> 4) & 0xf) * 1000 + (b[1] & 0xf) * 100 + ((b[2] >> 4) & 0xf) * 10 + (b[2] & 0xf)
}
function numberToBcd3(v: number): number[] {
  const s = Math.max(0, Math.min(999999, v)).toString().padStart(6, '0')
  return [parseInt(s[0] + s[1], 16), parseInt(s[2] + s[3], 16), parseInt(s[4] + s[5], 16)]
}

export function exchangeRateYen(rate: ExchangeRate): number {
  return bcd3ToNumber(rate.moneyBytes)
}

export function writeExchangeRate(rom: Rom, rate: ExchangeRate, yen: number, coins?: number): void {
  if (yen > 0) numberToBcd3(yen).forEach((b, k) => rom.writeU8(rate.moneyOff + k, b))
  if (coins && coins > 0 && coins <= 9999) {
    rom.writeU8(rate.coinsOff, coins & 0xff)
    rom.writeU8(rate.coinsOff + 1, coins >> 8)
  }
}
