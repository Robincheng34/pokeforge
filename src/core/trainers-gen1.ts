/**
 * Gen1 训练家数据（pokered data/trainers/parties.asm）：
 *   TrainerDataPointers = 47 项 dw（顺序 = trainer_constants 的类别序）
 *   每类别若干训练家，队伍块 = null(0x00) 终止：
 *     - 首字节 != 0xFF：该字节 = 全队公共等级，随后为物种（内部编号）列表，0x00 结束
 *     - 首字节 == 0xFF：随后为 (等级, 物种) 对，0x00 结束
 *   物种字节 = Gen1 内部编号（用 GEN1_INTERNAL_DEX 翻译图鉴号）
 */
import type { Rom } from './rom'
import { romMemo } from './cache'
import { GEN1_INTERNAL_DEX } from './evos'

export const CLASS_ZH_GEN1: string[] = [
  '（无）', '短裤小子', '捕虫少年', '迷你裙', '水手', '初级训练家♂', '初级训练家♀', '宝可梦狂',
  '超级书呆子', '登山男', '暴走族', '怪盗', '工程师', '杂耍艺人(未用)', '钓鱼客', '游泳选手♂',
  '肌肉男', '赌徒', '美女', '超能力者', '吉他手', '杂耍艺人', '驯兽师', '鸟饲育家',
  '空手道王', '对手(1)', '大木博士', '训练馆长', '科学家', '火箭队首领坂木', '火箭队喽啰♂', '精英训练家♂',
  '精英训练家♀', '希巴(四天王)', '小刚(尼比道馆)', '小霞(华蓝道馆)', '马志士(枯叶道馆)', '莉佳(玉虹道馆)', '阿桔(浅红道馆)', '夏伯(红莲道馆)',
  '娜姿(金黄道馆)', '绅士', '对手(2)', '对手(3)', '科拿(四天王)', '灵媒', '菊子(四天王)', '渡(四天王)'
]

/** 道馆首领/四天王（人物队列捷径，cls = 指针表索引 0 起） */
export const GYMS_GEN1: Array<{ cls: number; name: string; sub: string }> = [
  { cls: 33, name: '小刚', sub: '尼比道馆' },
  { cls: 34, name: '小霞', sub: '华蓝道馆' },
  { cls: 35, name: '马志士', sub: '枯叶道馆' },
  { cls: 36, name: '莉佳', sub: '玉虹道馆' },
  { cls: 37, name: '阿桔', sub: '浅红道馆' },
  { cls: 38, name: '夏伯', sub: '红莲道馆' },
  { cls: 39, name: '娜姿', sub: '金黄道馆' },
  { cls: 28, name: '坂木', sub: '火箭队基地' },
  { cls: 43, name: '科拿', sub: '四天王 1' },
  { cls: 32, name: '希巴', sub: '四天王 2' },
  { cls: 45, name: '菊子', sub: '四天王 3' },
  { cls: 46, name: '渡', sub: '四天王 4' }
]

export interface Gen1TrainerMon {
  level: number
  species: number // 图鉴号（翻译后）
  lvOff: number
  spOff: number
}

export interface Gen1Trainer {
  off: number
  mons: Gen1TrainerMon[]
}

export interface Gen1ClassData {
  tableOff: number
  bank: number
  words: number[]
  classes: Gen1Trainer[][] // 每类别的训练家列表
}

const YOUNGSTER_SIG = Buffer.from([0x0b, 0xa5, 0x6c, 0x00]) // 11, RATTATA($A5), EKANS($6C), 0
const BUG_SIG = Buffer.from([0x06, 0x70, 0x7b, 0x00]) // 6, WEEDLE($70), CATERPIE($7B), 0
const CLASS_COUNT = 47
const cache = new WeakMap<object, Gen1ClassData | null>()

export function findGen1Trainers(rom: Rom): Gen1ClassData | null {
  if (cache.has(rom)) return cache.get(rom)!
  const d = rom.data
  for (let x = 0x4000; x < d.length - 100; x++) {
    const w0 = d[x] | (d[x + 1] << 8)
    if (w0 < 0x4000 || w0 >= 0x8000) continue
    for (let b = 1; b < 0x80; b++) {
      const off = b * 0x4000 + (w0 - 0x4000)
      if (d.subarray(off, off + 4).equals(YOUNGSTER_SIG)) {
        const w1 = d[x + 2] | (d[x + 3] << 8)
        const off1 = b * 0x4000 + (w1 - 0x4000)
        if (d.subarray(off1, off1 + 4).equals(BUG_SIG)) {
          const words: number[] = []
          for (let k = 0; k < CLASS_COUNT; k++) words.push(d[x + k * 2] | (d[x + k * 2 + 1] << 8))
          if (!words.every((w) => w >= 0x4000 && w < 0x8000)) break
          const data: Gen1ClassData = { tableOff: x, bank: b, words, classes: [] }
          for (let c = 0; c < CLASS_COUNT; c++) data.classes.push(parseClass(rom, words, c, b))
          cache.set(rom, data)
          return data
        }
      }
    }
  }
  cache.set(rom, null)
  return null
}

/** 解析一个类别的训练家（块 = 0x00 终止的列表，顺序排列到下一类别起始为止） */
function parseClass(rom: Rom, words: number[], cls: number, bank: number): Gen1Trainer[] {
  const start = bank * 0x4000 + (words[cls] - 0x4000)
  const limit = cls + 1 < CLASS_COUNT ? bank * 0x4000 + (words[cls + 1] - 0x4000) : start + 0x800
  const trainers: Gen1Trainer[] = []
  let cur = start
  while (cur < limit - 2 && trainers.length < 20) {
    const trOff = cur
    const mons: Gen1TrainerMon[] = []
    let ok = true
    const first = rom.readU8(cur)
    if (first === 0xff) {
      cur++
      while (cur < limit) {
        const lv = rom.readU8(cur)
        const sp = rom.readU8(cur + 1)
        if (lv === 0x00) { cur++; break }
        if (lv > 100 || sp === 0 || sp >= GEN1_INTERNAL_DEX.length) { ok = false; break }
        mons.push({ level: lv, species: GEN1_INTERNAL_DEX[sp], lvOff: cur, spOff: cur + 1 })
        cur += 2
      }
    } else {
      const lv = first
      cur++
      while (cur < limit) {
        const sp = rom.readU8(cur)
        if (sp === 0x00) { cur++; break }
        if (sp >= GEN1_INTERNAL_DEX.length) { ok = false; break }
        mons.push({ level: lv, species: GEN1_INTERNAL_DEX[sp], lvOff: trOff, spOff: cur })
        cur++
      }
    }
    if (!ok || mons.length === 0) break
    trainers.push({ off: trOff, mons })
  }
  return trainers
}

export function readGen1Class(rom: Rom, data: Gen1ClassData, cls: number): Gen1Trainer[] {
  return data.classes[cls]
}

export function writeGen1MonLevel(rom: Rom, mon: Gen1TrainerMon, level: number): void {
  if (level < 1 || level > 100) return
  // 公共等级块：整块共享一个 level 字节（lvOff 相同）——写单块（同类所有 mon 的 lvOff 一致）
  rom.writeU8(mon.lvOff, level)
}

export function writeGen1MonSpecies(rom: Rom, mon: Gen1TrainerMon, dex: number): void {
  const internal = GEN1_INTERNAL_DEX.indexOf(dex)
  if (internal < 1) return
  rom.writeU8(mon.spOff, internal)
}
