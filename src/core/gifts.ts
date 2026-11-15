import { romMemo } from './cache'
/**
 * Gen2 全游戏赠送宝可梦事件（givepoke/giveegg 脚本指令 + 特殊例程）
 * 每个礼物用唯一字节签名定位（物种/等级字节可改）
 * 签名已在银/金/Tom_C/水晶实测校准
 */
export interface GiftDef {
  key: string
  name: string
  location: string
  /** 物种字节签名（givepoke = 2D 物种 等级 道具 训练标记） */
  sig: string
  speciesOff: number
  levelOff: number
  /** 默认物种（用于识别与展示） */
  defaultSpecies: number
  defaultLevel: number
  /** 额外校验：sig+checkOff 处的字节 */
  checkOff?: number
  checkByte?: number
}

export const GIFT_DEFS: GiftDef[] = [
  {
    key: 'togepi-egg', name: '波克比的蛋', location: '桔梗市精灵中心（助手赠送）',
    sig: '2eaf05', speciesOff: 1, levelOff: 2, defaultSpecies: 175, defaultLevel: 5
  },
  {
    key: 'eevee-bill', name: '伊布', location: '满金市精灵中心（比尔的家人赠送）',
    sig: '2d850140000', speciesOff: 1, levelOff: 2, defaultSpecies: 133, defaultLevel: 20
  },
  {
    key: 'tyrogue-kiyo', name: '巴尔郎', location: '擂钵山（空手道王信彦赠送）',
    sig: '2decca0000', speciesOff: 1, levelOff: 2, defaultSpecies: 236, defaultLevel: 10
  },
  {
    key: 'spearow-mail', name: '烈雀（带信件）', location: '35号道路门口（送信委托）',
    sig: '2d400a0001', speciesOff: 1, levelOff: 2, defaultSpecies: 64, defaultLevel: 10
  },
  {
    key: 'abra-lottery', name: '凯西（抽签奖品）', location: '满金市游戏中心',
    sig: '2d3f0a0000', speciesOff: 1, levelOff: 2, defaultSpecies: 63, defaultLevel: 10
  },
  {
    key: 'mrmime-prize', name: '吸盘魔偶（兑换奖品）', location: '玉虹市游戏中心（关都）',
    sig: '2d7a0f0000', speciesOff: 1, levelOff: 2, defaultSpecies: 122, defaultLevel: 15
  },
  {
    key: 'eevee-prize', name: '伊布（兑换奖品）', location: '玉虹市游戏中心（关都）',
    sig: '2d850f0000', speciesOff: 1, levelOff: 2, defaultSpecies: 133, defaultLevel: 15
  },
  {
    key: 'porygon-prize', name: '多边兽（兑换奖品）', location: '玉虹市游戏中心（关都）',
    sig: '2d89140000', speciesOff: 1, levelOff: 2, defaultSpecies: 137, defaultLevel: 20
  },
  {
    key: 'shuckle-mania', name: '壶壶', location: '湛蓝市（迷之家男子寄养）',
    sig: '3ed5ea', speciesOff: 1, levelOff: 5, defaultSpecies: 213, defaultLevel: 15,
    checkOff: 5, checkByte: 0x0f
  }
]

export interface FoundGift {
  def: GiftDef
  off: number
  species: number
  level: number
}

function findGiftsUncached(
  rom: { readU8: (o: number) => number; size: number }
): FoundGift[] {
  const found: FoundGift[] = []
  for (const def of GIFT_DEFS) {
    const sig = Buffer.from(def.sig, 'hex')
    for (let i = 0x4000; i <= rom.size - sig.length; i++) {
      let ok = true
      for (let k = 0; k < sig.length; k++) {
        if (rom.readU8(i + k) !== sig[k]) { ok = false; break }
      }
      if (!ok) continue
      if (def.checkOff !== undefined && def.checkByte !== undefined && rom.readU8(i + def.checkOff) !== def.checkByte) continue
      found.push({
        def,
        off: i,
        species: rom.readU8(i + def.speciesOff),
        level: rom.readU8(i + def.levelOff)
      })
    }
  }
  return found
}

export function findGifts(rom: Parameters<typeof findGiftsUncached>[0]) {
  return romMemo(rom, 'gifts', () => findGiftsUncached(rom))
}
