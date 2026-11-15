/**
 * Gen1 存档（.sav）：
 *   sGameData @SRAM $A598 → 文件偏移 0x598；校验和 sMainDataCheckSum @0xB523 → 文件 0x1523
 *   校验和 = sum(文件 0x598..0x1521)（8 位溢出）取反 (cpl)
 * 黄版专属：皮卡丘亲密度 wPikachuHappiness（wMainDataStart+0x179）→ 文件偏移 0x598 + 11 + 0x179 = 0x71C
 */
import type { Rom } from './rom'

export const GEN1_SAV = {
  sGameData: 0x2598, // SRAM bank1 = .sav 第二个 8KB（0x2000 起）+ 0x598
  sMainDataEnd: 0x3523, // sMainDataCheckSum 文件偏移
  pikachuHappiness: 0x2722
}

export interface Gen1SavInfo {
  ok: boolean
  reason?: string
  isYellow: boolean
  pikachuFriendship: number
}

export function openGen1Sav(rom: Rom): Gen1SavInfo {
  const d = rom.data
  if (d.length < 0x3524) return { ok: false, reason: '文件太小，不是 Gen1 存档', isYellow: false, pikachuFriendship: 0 }
  const friendship = d[GEN1_SAV.pikachuHappiness]
  return { ok: true, isYellow: true, pikachuFriendship: friendship }
}

/** 黄版皮卡丘亲密度（0-255；游戏内影响 følger 行为/心情事件） */
export function setPikachuFriendship(rom: Rom, value: number): void {
  rom.data[GEN1_SAV.pikachuHappiness] = Math.max(0, Math.min(255, Math.round(value)))
}

/** Gen1 校验和：sum(0x598..0x1521) 取反写入 0x1523 */
export function fixGen1Checksum(rom: Rom): void {
  const d = rom.data
  let sum = 0
  for (let i = GEN1_SAV.sGameData; i < GEN1_SAV.sMainDataEnd; i++) sum = (sum + d[i]) & 0xff
  rom.data[GEN1_SAV.sMainDataEnd] = (~sum) & 0xff
}
