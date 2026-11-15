/**
 * Gen2 赠送宝可梦引擎补丁（GivePoke 例程，pokegold move_mon.asm TryAddMonToParty）
 *
 * 引擎原逻辑（领取赠送宝可梦时）：
 *   call Random / ld b,a / call Random / ld c,a   → DV 随机（CD xx xx 47 CD xx xx 4F）
 *   ld a, BASE_HAPPINESS / ld [de],a / inc de     → 亲密度
 *   xor a / ld [de],a / inc de                    → 宝可病毒清零
 *   ld [de],a / inc de ×2                          → 捕获数据清零
 *
 * 补丁（改引擎字节，不依赖脚本）：
 *   闪光：call Random/ld b,a ×2 → ld b,0xAA / ld c,0xAA（DV 10/10/10/10 = 闪光判定）
 *   病毒：xor a → ld a,1（病毒=1 感染毒株1），捕获数据仍写 0（xor a 移位实现）
 * 影响范围：所有走 GivePoke 的赠送宝可梦（初始三家/伊布/巴尔郎/壶壶等），野生宝可梦走别的路径不受影响。
 */
import type { Rom } from './rom'

export interface GiftPatchSite {
  dvOff: number // call Random; ld b,a; call Random; ld c,a
  pokerusOff: number // xor a（病毒清零处）
}

/** 签名：CD xx xx 47 CD xx xx 4F 78 12 13 79 12 13（写 DV 字节序列） */
function findDvSite(d: Buffer): number | null {
  for (let i = 0; i < d.length - 15; i++) {
    if (
      d[i] === 0xcd && d[i + 3] === 0x47 && d[i + 4] === 0xcd && d[i + 7] === 0x4f &&
      d[i + 8] === 0x78 && d[i + 9] === 0x12 && d[i + 10] === 0x13 &&
      d[i + 11] === 0x79 && d[i + 12] === 0x12 && d[i + 13] === 0x13
    ) return i
  }
  return null
}

/** DV 站点后 ~0x40 字节内找病毒清零：3E ?? 12 13 AF 12 13（亲密度写 + xor a） */
function findPokerusSite(d: Buffer, dvOff: number): number | null {
  for (let i = dvOff; i < Math.min(dvOff + 0x60, d.length - 6); i++) {
    if (d[i] === 0xaf && d[i - 1] === 0x13 && d[i - 2] === 0x12 && d[i - 4] === 0x3e && d[i + 1] === 0x12 && d[i + 2] === 0x13) return i
  }
  return null
}

const siteCache = new WeakMap<object, GiftPatchSite | null>()

export function findGiftPatchSite(rom: Rom): GiftPatchSite | null {
  if (siteCache.has(rom)) return siteCache.get(rom)!
  const dv = findDvSite(rom.data)
  const site: GiftPatchSite | null = dv === null ? null : (() => {
    const pk = findPokerusSite(rom.data, dv)
    return pk === null ? null : { dvOff: dv, pokerusOff: pk }
  })()
  siteCache.set(rom, site)
  return site
}

const DV_PATCH = Buffer.from([0x06, 0xaa, 0x00, 0x00, 0x0e, 0xaa, 0x00, 0x00]) // ld b,0xAA; nop; nop; ld c,0xAA; nop; nop

const DV_MALE = Buffer.from([0x06, 0xff, 0x00, 0x00, 0x0e, 0xff, 0x00, 0x00]) // ld b,0xFF / ld c,0xFF：DV 组合字节 0xFFFF > 任意性别比 → 全雄
const DV_FEMALE = Buffer.from([0x06, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00]) // ld b,0x00 / ld c,0x00：组合字节 0 ≤ 任意性别比 → 全雌（性别比 0 的纯雄种族引擎先判为雄）

export type GiftDvMode = 'random' | 'male' | 'female' | 'shiny'

/** 设置领取宝可梦的 DV 模式（引擎级，作用于全部走 GivePoke 的赠送宝可梦） */
export function setGiftDvMode(rom: Rom, site: GiftPatchSite, mode: GiftDvMode): void {
  if (mode === 'random') {
    rom.revertRange(site.dvOff, site.dvOff + 8)
    return
  }
  const patch = mode === 'male' ? DV_MALE : mode === 'female' ? DV_FEMALE : DV_PATCH
  patch.copy(rom.data, site.dvOff)
}

export function readGiftDvMode(rom: Rom, site: GiftPatchSite): GiftDvMode {
  const b1 = rom.data[site.dvOff], b2 = rom.data[site.dvOff + 1], b5 = rom.data[site.dvOff + 4], b6 = rom.data[site.dvOff + 5]
  if (b1 === 0xaa && b2 === 0xaa && b5 === 0xaa && b6 === 0xaa) return 'shiny'
  if (b1 === 0x06 && b2 === 0xff && b5 === 0x0e && b6 === 0xff) return 'male'
  if (b1 === 0x06 && b2 === 0x00 && b5 === 0x0e && b6 === 0x00) return 'female'
  return 'random'
}

export function setGiftShiny(rom: Rom, site: GiftPatchSite, shiny: boolean): void {
  if (shiny) DV_PATCH.copy(rom.data, site.dvOff)
  else rom.revertRange(site.dvOff, site.dvOff + 8)
}

export function setGiftPokerus(rom: Rom, site: GiftPatchSite, on: boolean): void {
  // 原: AF 12 13 12 13 12（xor a; 写病毒; inc de; 写捕获1; inc de; 写捕获2）
  // 补: 3E 01 12 13 AF 12（ld a,1; 写病毒; inc de; xor a; 写捕获1）→ 病毒=1 捕获数据仍 0
  const orig = rom.readBytes(site.pokerusOff, 6)
  if (on) {
    rom.data[site.pokerusOff] = 0x3e
    rom.data[site.pokerusOff + 1] = 0x01
    rom.data[site.pokerusOff + 4] = 0xaf
  } else {
    rom.writeU8(site.pokerusOff, orig[0])
    rom.writeU8(site.pokerusOff + 1, orig[1])
    rom.writeU8(site.pokerusOff + 4, orig[4])
  }
}

/** 当前状态读取（用于 UI 勾选框回显） */
export function readGiftPatchState(rom: Rom, site: GiftPatchSite): { shiny: boolean; pokerus: boolean } {
  const shiny = rom.data[site.dvOff] === 0x06 && rom.data[site.dvOff + 1] === 0xaa && rom.data[site.dvOff + 4] === 0x0e && rom.data[site.dvOff + 5] === 0xaa
  const pokerus = rom.data[site.pokerusOff] === 0x3e && rom.data[site.pokerusOff + 1] === 0x01 && rom.data[site.pokerusOff + 4] === 0xaf
  return { shiny, pokerus }
}

// ---- 野生宝可梦 DV 生成例程（战斗生成敌方宝可梦处，TryAddMonToParty 的战斗路径） ----
// 签名：CD xx xx 47 CD xx xx 4F 21 ?? ?? 78 22 71（call Random×2 → ld hl,xx / ld a,b / ld [hl+],a / ld [hl],c）
const wildCache = new WeakMap<object, number | null>()

export function findWildDvSite(rom: Rom): number | null {
  if (wildCache.has(rom)) return wildCache.get(rom)!
  const d = rom.data
  let site: number | null = null
  for (let i = 0; i < d.length - 15; i++) {
    if (
      d[i] === 0xcd && d[i + 3] === 0x47 && d[i + 4] === 0xcd && d[i + 7] === 0x4f &&
      d[i + 8] === 0x21 && d[i + 11] === 0x78 && d[i + 12] === 0x22 && d[i + 13] === 0x71
    ) { site = i; break }
  }
  wildCache.set(rom, site)
  return site
}

export function setWildShiny(rom: Rom, shiny: boolean): boolean {
  const off = findWildDvSite(rom)
  if (off === null) return false
  if (shiny) DV_PATCH.copy(rom.data, off)
  else rom.revertRange(off, off + 8)
  return true
}

export function readWildShiny(rom: Rom): boolean {
  const off = findWildDvSite(rom)
  if (off === null) return false
  return rom.data[off] === 0x06 && rom.data[off + 1] === 0xaa && rom.data[off + 4] === 0x0e && rom.data[off + 5] === 0xaa
}
