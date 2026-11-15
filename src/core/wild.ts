/**
 * Gen2 野生遭遇表（结构经 Silver 实测 + pokegold 源码双重确认）：
 * 每条 21 对 (level, species)：清晨 7 / 白天 7 / 夜晚 7，首字节从 labelAddr-1 开始。
 * 水域表结构相同但为 3 组？—— pokegold water_mons 每组 7 条同样适用。
 */
import { romMemo } from './cache'
import wildTables from './wildtables-goldsilver.json'

export interface WildTableRef {
  label: string
  bank: number
  addr: number
}

export const WILD_TABLES_GS = wildTables as { grass: WildTableRef[]; water: WildTableRef[] }

export function gbTableFileOffset(t: WildTableRef): number {
  return t.bank * 0x4000 + (t.addr - 0x4000)
}

/**
 * 剧情推进顺序（金/银/水晶一周目流程）：
 * 若叶镇 → 29-31 号道路 → 喇叭芽之塔 → 桔梗 → 32/互连洞/33 → 桧皮森林 → 呆呆兽井 → 34/35/自然公园 →
 * 36/37 → 烧焦塔 → 铃铛塔 → 38/39 → 浅黄/40/41 → 漩涡岛 → 湛蓝 → 42/擂钵山 → 卡吉/43/愤怒之湖 →
 * 44/冰雪小径 → 黑暗洞穴 → 龙之圣域 → 烟墨/45/46 → 白银山 → 关都（27/枞树瀑布/26/28 → 1-25 号道路与各洞窟 → 城镇水域）
 */
export const WILD_STORY_ORDER: string[] = [
  'NEW_BARK_TOWN', 'ROUTE_29', 'CHERRYGROVE_CITY', 'ROUTE_30', 'ROUTE_31',
  'SPROUT_TOWER_2F', 'SPROUT_TOWER_3F', 'VIOLET_CITY',
  'RUINS_OF_ALPH_OUTSIDE', 'RUINS_OF_ALPH_INNER_CHAMBER',
  'ROUTE_32', 'UNION_CAVE_1F', 'UNION_CAVE_B1F', 'UNION_CAVE_B2F', 'ROUTE_33',
  'ILEX_FOREST', 'AZALEA_CITY', 'SLOWPOKE_WELL_B1F', 'SLOWPOKE_WELL_B2F',
  'ROUTE_34', 'ROUTE_35', 'NATIONAL_PARK', 'ROUTE_36', 'ROUTE_37',
  'ECRUTEAK_CITY', 'BURNED_TOWER_1F', 'BURNED_TOWER_B1F',
  'TIN_TOWER_2F', 'TIN_TOWER_3F', 'TIN_TOWER_4F', 'TIN_TOWER_5F', 'TIN_TOWER_6F', 'TIN_TOWER_7F', 'TIN_TOWER_8F', 'TIN_TOWER_9F',
  'ROUTE_38', 'ROUTE_39', 'OLIVINE_CITY', 'OLIVINE_PORT', 'ROUTE_40', 'ROUTE_41',
  'CIANWOOD_CITY', 'WHIRL_ISLAND_NW', 'WHIRL_ISLAND_NE', 'WHIRL_ISLAND_SW', 'WHIRL_ISLAND_SE', 'WHIRL_ISLAND_CAVE', 'WHIRL_ISLAND_B1F', 'WHIRL_ISLAND_B2F', 'WHIRL_ISLAND_LUGIA_CHAMBER',
  'ROUTE_42', 'MOUNT_MORTAR_1F_OUTSIDE', 'MOUNT_MORTAR_1F_INSIDE', 'MOUNT_MORTAR_2F_INSIDE', 'MOUNT_MORTAR_B1F',
  'MAHOGANY_CITY', 'ROUTE_43', 'LAKE_OF_RAGE', 'ROUTE_44',
  'ICE_PATH_1F', 'ICE_PATH_B1F', 'ICE_PATH_B2F_MAHOGANY_SIDE', 'ICE_PATH_B2F_BLACKTHORN_SIDE', 'ICE_PATH_B3F',
  'DARK_CAVE_VIOLET_ENTRANCE', 'BLACKTHORN_CITY', 'DARK_CAVE_BLACKTHORN_ENTRANCE', 'DRAGONS_DEN_B1F',
  'ROUTE_45', 'ROUTE_46',
  'SILVER_CAVE_OUTSIDE', 'SILVER_CAVE_ROOM_1', 'SILVER_CAVE_ROOM_2', 'SILVER_CAVE_ROOM_3', 'SILVER_CAVE_ITEM_ROOMS',
  'Kanto_ROUTE_27', 'Kanto_TOHJO_FALLS', 'Kanto_ROUTE_28', 'Kanto_ROUTE_26',
  'Kanto_ROUTE_1', 'Kanto_ROUTE_2', 'Kanto_ROUTE_22', 'PALLET_TOWN',
  'Kanto_ROUTE_3', 'Kanto_ROUTE_4', 'Kanto_MOUNT_MOON', 'Kanto_ROUTE_5', 'Kanto_ROUTE_6',
  'Kanto_ROUTE_7', 'Kanto_ROUTE_8', 'Kanto_ROUTE_9', 'Kanto_ROUTE_10_NORTH', 'Kanto_ROCK_TUNNEL_1F', 'Kanto_ROCK_TUNNEL_B1F',
  'Kanto_ROUTE_11', 'Kanto_ROUTE_12', 'Kanto_ROUTE_13', 'Kanto_ROUTE_14', 'Kanto_ROUTE_15',
  'Kanto_ROUTE_16', 'Kanto_ROUTE_17', 'Kanto_ROUTE_18', 'Kanto_ROUTE_21', 'Kanto_DIGLETTS_CAVE',
  'VERMILION_CITY', 'VERMILION_PORT', 'CELADON_CITY', 'Kanto_ROUTE_24', 'Kanto_ROUTE_25',
  'CERULEAN_CITY', 'FUCHSIA_CITY', 'Kanto_ROUTE_19', 'Kanto_ROUTE_20', 'CINNABAR_ISLAND',
  'Kanto_VICTORY_ROAD'
]

export function wildStoryIndex(label: string): number {
  const i = WILD_STORY_ORDER.indexOf(label)
  return i === -1 ? 1000 + label.charCodeAt(0) : i
}

/**
 * 动态校正野生遭遇表偏移：部分汉化/魔改版会把数据块整体搬移。
 * 用喇叭芽之塔2F 的表特征字节定位实际位置，算出搬移量 delta，平移全部表。
 * 已在 Tom_C 汉化银（delta=+0xEA）与标准布局 ROM（delta=0）实测。
 */
const SPROUT_SIG = Buffer.from(
  '03130413051303130613051305130313041305130313061305130513035c045c055c0313065c05130513',
  'hex'
)

export function resolveWildDelta(
  rom: { readBytes: (o: number, l: number) => Buffer; size: number }
): number {
  const data = rom.readBytes(0x4000, rom.size - 0x4000)
  for (let i = 0; i <= data.length - SPROUT_SIG.length; i++) {
    if (data[i] === SPROUT_SIG[0] && data.subarray(i, i + SPROUT_SIG.length).equals(SPROUT_SIG)) {
      const hit = 0x4000 + i
      // 特征命中 = 等级字节（pairs 起点）= stock 的 label-1 处
      const stockPairs = gbTableFileOffset(WILD_TABLES_GS.grass[0]) - 1
      const delta = hit - stockPairs
      // 只接受合理范围内的搬移（同一 bank 内 ±0x2000）
      if (Math.abs(delta) < 0x2000) return delta
    }
  }
  return 0
}

function getWildTablesUncached(
  rom: { readBytes: (o: number, l: number) => Buffer; size: number }
): { grass: WildTableRef[]; water: WildTableRef[]; delta: number } {
  const delta = resolveWildDelta(rom)
  const shift = (t: WildTableRef): WildTableRef => {
    let addr = t.addr + delta
    let bank = t.bank
    // 跨 bank 修正
    while (addr >= 0x8000) { addr -= 0x4000; bank++ }
    while (addr < 0x4000) { addr += 0x4000; bank-- }
    return { ...t, addr, bank }
  }
  return { grass: WILD_TABLES_GS.grass.map(shift), water: WILD_TABLES_GS.water.map(shift), delta }
}

export const TIMES = ['清晨', '白天', '夜晚']
export const SLOTS_PER_TIME = 7

export interface WildSlot {
  level: number
  species: number
}

export interface WildTableData {
  ref: WildTableRef
  /** 文件偏移（第一对 level 字节） */
  pairsOffset: number
  slots: WildSlot[] // 21 个
  rates?: [number, number, number]
}

/** 解析草丛表（label 指向 def_grass_wildmons 内部，pairs 从 -1 开始） */
export function readGrassWildTable(rom: { readU8: (o: number) => number }, t: WildTableRef): WildTableData {
  const off = gbTableFileOffset(t)
  const pairsOffset = off - 1
  const slots: WildSlot[] = []
  for (let i = 0; i < 21; i++) {
    slots.push({ level: rom.readU8(pairsOffset + i * 2), species: rom.readU8(pairsOffset + i * 2 + 1) })
  }
  return { ref: t, pairsOffset, slots }
}

export function writeWildSlot(
  rom: { writeU8: (o: number, v: number) => void },
  data: WildTableData,
  slotIndex: number,
  field: 'level' | 'species',
  value: number
): void {
  if (slotIndex < 0 || slotIndex >= 21) throw new Error('slotIndex 越界')
  rom.writeU8(data.pairsOffset + slotIndex * 2 + (field === 'level' ? 0 : 1), value)
}

export function getWildTables(rom: Parameters<typeof getWildTablesUncached>[0]) {
  return romMemo(rom, 'wildTables', () => getWildTablesUncached(rom))
}
