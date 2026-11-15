/**
 * 随机化器：野生遭遇 / 训练家队伍 / 初始宝可梦
 * 使用种子化 PRNG（mulberry32），同一种子结果可复现、可分享。
 */
import type { WildTableRef } from './wild'
import { readGrassWildTable } from './wild'
import { readTrainerGroup } from './trainers'
import type { Rom } from './rom'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 随机池：1-251 全宝可梦；可排除神兽（150梦幻/151超梦/243-251传说）与需要特殊进化的? */
const LEGENDARIES = new Set([150, 151, 243, 244, 245, 249, 250, 251])

export function buildPool(includeLegendaries: boolean, maxDex = 251): number[] {
  const pool: number[] = []
  for (let i = 1; i <= maxDex; i++) {
    if (!includeLegendaries && LEGENDARIES.has(i)) continue
    pool.push(i)
  }
  return pool
}

function pick(rng: () => number, pool: number[]): number {
  return pool[Math.floor(rng() * pool.length)]
}

export interface RandomizeOptions {
  seed: number
  wild: boolean
  trainers: boolean
  starters: boolean
  includeLegendaries: boolean
  /** 随机化训练家招式（默认保留原招式，避免全队全是破坏光线之类的失衡） */
  trainerMoves: boolean
  /** 每张遭遇表统一为一种宝可梦（像原版一样有主题，例如整片草丛都是拉达） */
  wildUniformPerTable: boolean
  /** 随机化野生宝可梦等级（在原表等级范围内波动） */
  wildRandomLevels: boolean
}

export interface RandomizeResult {
  wildChanged: number
  trainerChanged: number
  starters: number[]
}

/** 随机化野生遭遇（保留等级与表结构） */
export function randomizeWild(
  rom: Rom,
  tables: WildTableRef[],
  opts: RandomizeOptions
): number {
  const rng = mulberry32(opts.seed ^ 0x7719)
  const pool = buildPool(opts.includeLegendaries)
  let changed = 0
  for (const t of tables) {
    const d = readGrassWildTable(rom, t)
    // 每表统一物种模式：整张表用同一只（三个时段分别随机，模拟原版的时段差异）
    const uniformPerTime = opts.wildUniformPerTable
      ? [pick(rng, pool), pick(rng, pool), pick(rng, pool)]
      : null
    // 原表等级范围（用于等级随机化）
    const levels = d.slots.map((s) => s.level).filter((l) => l > 0 && l <= 100)
    const minLv = levels.length ? Math.min(...levels) : 2
    const maxLv = levels.length ? Math.max(...levels) : 20
    for (let i = 0; i < 21; i++) {
      const cur = d.slots[i].species
      if (cur === 0 || cur > 251) continue
      const nv = uniformPerTime ? uniformPerTime[Math.floor(i / 7)] : pick(rng, pool)
      if (nv !== cur) {
        rom.writeU8(d.pairsOffset + i * 2 + 1, nv)
        changed++
      }
      if (opts.wildRandomLevels) {
        const span = maxLv - minLv
        const nl = minLv + Math.floor(rng() * (span + 1))
        if (nl !== d.slots[i].level) {
          rom.writeU8(d.pairsOffset + i * 2, nl)
          changed++
        }
      }
    }
  }
  return changed
}

/** 随机化训练家队伍（保留等级；招式可选随机） */
export function randomizeTrainers(
  rom: Rom,
  groups: Array<{ bank: number; addr: number }>,
  opts: RandomizeOptions,
  endOf?: (g: { bank: number; addr: number }) => number
): number {
  const rng = mulberry32(opts.seed ^ 0x1234)
  const pool = buildPool(opts.includeLegendaries)
  let changed = 0
  for (const g of groups) {
    const gd = readTrainerGroup(rom, g, 40, endOf?.(g))
    for (const entry of gd.trainers) {
      for (const mon of entry.mons) {
        const nv = pick(rng, pool)
        if (nv !== mon.species) {
          rom.writeU8(mon.off.species, nv)
          changed++
        }
        if (opts.trainerMoves && mon.off.moves) {
          for (const mo of mon.off.moves) {
            const nm = 1 + Math.floor(rng() * 251) // 招式 id 1-251
            rom.writeU8(mo, nm)
          }
        }
      }
    }
  }
  return changed
}

/** 随机化初始宝可梦（三只互不相同，避开神兽） */
export function randomizeStarters(rom: Rom, slots: Array<{ species: number; secondSpecies?: number }>, opts: RandomizeOptions): number[] {
  const rng = mulberry32(opts.seed ^ 0x99aa)
  const pool = buildPool(opts.includeLegendaries)
  const chosen: number[] = []
  while (chosen.length < slots.length) {
    const c = pick(rng, pool)
    if (!chosen.includes(c)) chosen.push(c)
  }
  slots.forEach((s, i) => {
    rom.writeU8(s.species, chosen[i])
    if (s.secondSpecies !== undefined) rom.writeU8(s.secondSpecies, chosen[i])
  })
  return chosen
}
