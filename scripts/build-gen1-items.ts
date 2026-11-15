/** pokered item_constants + PokeAPI → Gen1 道具中文名 */
import * as fs from 'fs'

const consts = fs.readFileSync('D:/openlite-env/tmp/rb-items.txt', 'utf8')
const gen1: Array<{ id: number; name: string }> = []
for (const m of consts.matchAll(/const ([A-Z0-9_]+)\s*; \$(..)/g)) {
  gen1.push({ id: parseInt(m[2], 16), name: m[1] })
}
console.log('Gen1 常量道具:', gen1.length)

const itemsCsv = fs.readFileSync('D:/openlite-env/tmp/items_all.csv', 'utf8')
const idToIdent: Record<number, string> = {}
for (const l of itemsCsv.split('\n').slice(1)) {
  const m = l.match(/^(\d+),([a-z0-9-]+),/)
  if (m) idToIdent[+m[1]] = m[2]
}
const namesCsv = fs.readFileSync('D:/openlite-env/tmp/item_names.csv', 'utf8')
const identToZh: Record<string, string> = {}
for (const l of namesCsv.split('\n').slice(1)) {
  const m = l.match(/^(\d+),12,"?([^",]+)"?$/)
  if (m && idToIdent[+m[1]]) identToZh[idToIdent[m[1] as unknown as number]] = m[2]
}

// const 名 → PokeAPI identifier（Gen2 构建脚本同款规则）
const SPECIAL: Record<string, string> = {
  POKE_BALL: 'poke-ball', GREAT_BALL: 'great-ball', MASTER_BALL: 'master-ball', ULTRA_BALL: 'ultra-ball',
  TOWN_MAP: 'town-map', BICYCLE: 'bicycle', SURFBOARD: 'surfboard', SAFARI_BALL: 'safari-ball',
  POKEDEX: 'pokedex', MOON_STONE: 'moon-stone', ANTIDOTE: 'antidote', BURN_HEAL: 'burn-heal',
  ICE_HEAL: 'ice-heal', AWAKENING: 'awakening', PARLYZ_HEAL: 'paralyze-heal', FULL_RESTORE: 'full-restore',
  MAX_POTION: 'max-potion', HYPER_POTION: 'hyper-potion', SUPER_POTION: 'super-potion', POTION: 'potion',
  ESCAPE_ROPE: 'escape-rope', REPEL: 'repel', MAX_REPEL: 'max-repel', SUPER_REPEL: 'super-repel',
  FULL_HEAL: 'full-heal', REVIVE: 'revive', MAX_REVIVE: 'max-revive', FRESH_WATER: 'fresh-water',
  SODA_POP: 'soda-pop', LEMONADE: 'lemonade', X_ATTACK: 'x-attack', X_DEFEND: 'x-defend',
  X_SPEED: 'x-speed', X_SPECIAL: 'x-special', X_ACCURACY: 'x-accuracy', GUARD_SPEC: 'guard-spec',
  DIRE_HIT: 'dire-hit', COIN: 'coin', COIN_CASE: 'coin-case', PP_UP: 'pp-up',
  ETHER: 'ether', MAX_ETHER: 'max-ether', ELIXER: 'elixir', MAX_ELIXER: 'max-elixir',
  FIRE_STONE: 'fire-stone', THUNDER_STONE: 'thunder-stone', WATER_STONE: 'water-stone', LEAF_STONE: 'leaf-stone',
  NUGGET: 'nugget', POKe_DOLL: 'poke-doll', POKE_DOLL: 'poke-doll', POKEDOLL: 'poke-doll',
  HP_UP: 'hp-up', PROTEIN: 'protein', IRON: 'iron', CARBOS: 'carbos', CALCIUM: 'calcium',
  OLD_ROD: 'old-rod', GOOD_ROD: 'good-rod', SUPER_ROD: 'super-rod', ITEMFINDER: 'item-finder',
  SILPH_SCOPE: 'silph-scope', POKE_FLUTE: 'poke-flute', S_S_TICKET: 's-s-ticket', OAKS_PARCEL: 'oaks-parcel',
  GOLD_TEETH: 'gold-teeth', LIFT_KEY: 'lift-key', CARD_KEY: 'card-key', BIKE_VOUCHER: 'bike-voucher',
  EXP_ALL: 'exp-share', EXP_SHARE: 'exp-share', FULL_RESTORE2: ''
}
function ident(name: string): string {
  return (SPECIAL[name] ?? name.toLowerCase().replace(/_/g, '-'))
}

const MANUAL: Record<string, string> = {
  NO_ITEM: '（无）', SURFBOARD: '冲浪板', TOWN_MAP: '城镇地图', POKEDEX: '图鉴',
  OAKS_PARCEL: '大木的包裹', ITEM_2C: '未使用', ITEM_32: '未使用',
  OLD_AMBER: '秘密琥珀', CANDY_JAR: ''
}
const zh: Record<number, string> = {}
let resolved = 0
for (const { id, name } of gen1) {
  if (MANUAL[name]) { zh[id] = MANUAL[name]; continue }
  const z = identToZh[ident(name)]
  if (z) { zh[id] = z; resolved++ } else zh[id] = name
}
console.log('PokeAPI 解析成功:', resolved, '/', gen1.length)
// TM/HM 段 $C4-$FA → 招式机/秘传机（名称由 TMEditor 用 moveName 动态显示）
for (let i = 0xc4; i <= 0xc8; i++) zh[i] = '秘传机0' + (i - 0xc3)
for (let i = 0xc9; i <= 0xfa; i++) zh[i] = '招式机' + String(i - 0xc8).padStart(2, '0')
fs.writeFileSync('src/core/gen1-items-zh.json', JSON.stringify(zh))
console.log('写出 gen1-items-zh.json')
const sample = [1, 2, 3, 4, 10, 11, 16, 17]
console.log(sample.map((i) => i + ':' + zh[i]).join(' | '))
