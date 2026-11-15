/** 全国图鉴中文名（官方译名，来源 PokeAPI 数据库） */
import namesJson from './names.json'
import movesJson from './moves.json'

const NAMES: string[] = namesJson as unknown as string[]
const MOVE_NAMES: Record<number, string> = movesJson as unknown as Record<number, string>

export function speciesName(index: number): string {
  return index >= 1 && index <= NAMES.length && NAMES[index - 1] ? NAMES[index - 1] : `#${index}`
}

export function moveName(index: number): string {
  return MOVE_NAMES[index] ?? `招式${index}`
}
