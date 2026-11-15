/**
 * 从 pokegold item_constants.asm + PokeAPI 对照构建正确的 Gen2 道具名映射
 */
import * as fs from 'fs'

const consts = fs.readFileSync('D:/openlite-env/tmp/pokegold-master/constants/item_constants.asm', 'utf8')
// 1. Gen2 id(hex) → const 名
const gen2: Array<{ id: number; name: string }> = []
for (const m of consts.matchAll(/const ([A-Z0-9_]+)\s*; ([0-9a-f]{2})/g)) {
  gen2.push({ id: parseInt(m[2], 16), name: m[1] })
}
console.log('Gen2 常量道具:', gen2.length)

// 2. PokeAPI id → identifier
const itemsCsv = fs.readFileSync('D:/openlite-env/tmp/items_all.csv', 'utf8')
const idToIdent: Record<number, string> = {}
for (const l of itemsCsv.split('\n').slice(1)) {
  const m = l.match(/^(\d+),([a-z0-9-]+),/)
  if (m) idToIdent[+m[1]] = m[2]
}
// 3. PokeAPI id → 中文名（language 12）
const namesCsv = fs.readFileSync('D:/openlite-env/tmp/item_names.csv', 'utf8')
const identToZh: Record<string, string> = {}
for (const l of namesCsv.split('\n').slice(1)) {
  const m = l.match(/^(\d+),12,"?([^",]+)"?$/)
  if (m && idToIdent[+m[1]]) identToZh[idToIdent[+m[1]]] = m[2]
}

// 4. const 名 → identifier（蛇形转连字符 + 特例）
const SPECIAL: Record<string, string> = {
  POKE_BALL: 'poke-ball', BRIGHTPOWDER: 'bright-powder', WHT_APRICORN: 'white-apricorn',
  BLK_APRICORN: 'black-apricorn', PINK_APRICORN: 'pink-apricorn', GRN_APRICORN: 'green-apricorn',
  YLW_APRICORN: 'yellow-apricorn', BLU_APRICORN: 'blue-apricorn', RED_APRICORN: 'red-apricorn',
  S_S_TICKET: 'ss-ticket', SLOWPOKETAIL: 'slowpoke-tail', MYSTERY_EGG: 'mystery-egg',
  X_ACCURACY: 'x-accuracy', X_SPECIAL: 'x-special', OLD_ROD: 'old-rod', GOOD_ROD: 'good-rod',
  SUPER_ROD: 'super-rod', SILVER_LEAF: 'silver-leaf', GOLD_LEAF: 'gold-leaf',
  NORMAL_BOX: 'normal-box', GORGEOUS_BOX: 'gorgeous-box', SILVER_WING: 'silver-wing',
  RAINBOW_WING: 'rainbow-wing', CLEAR_BELL: 'clear-bell', GS_BALL: 'gs-ball',
  BLUESKY_MAIL: 'eon-mail', MOSAIC_MAIL: 'mosaic-mail', SURF_MAIL: 'surf-mail',
  LURE_BALL: 'lure-ball', MOON_STONE: 'moon-stone', SUN_STONE: 'sun-stone',
  LEAF_STONE: 'leaf-stone', FIRE_STONE: 'fire-stone', WATER_STONE: 'water-stone',
  THUNDERSTONE: 'thunder-stone',
  BURNT_BERRY: 'burnt-berry', ICE_BERRY: 'ice-berry',
  BITTER_BERRY: 'bitter-berry', MIRACLEBERRY: 'miracleberry', GOLD_BERRY: 'gold-berry',
  MYSTERYBERRY: 'mysteryberry', HEAL_POWDER: 'heal-powder', ENERGYPOWDER: 'energy-powder',
  ENERGY_ROOT: 'energy-root', HEAL_ROOT: 'heal-root', REVIVAL_HERB: 'revival-herb',
  FRUIT: 'fruit',
  PARLYZ_HEAL: 'paralyze-heal', MAX_ELIXER: 'max-elixir', ELIXER: 'elixir',
  X_DEFEND: 'x-defend', ITEMFINDER: 'item-finder',
  PSNCUREBERRY: 'psncure-berry', PRZCUREBERRY: 'przcure-berry',
  MINT_BERRY: 'mint-berry', TINYMUSHROOM: 'tiny-mushroom', SILVERPOWDER: 'silver-powder',
  TWISTEDSPOON: 'twisted-spoon', BLACKBELT_I: 'black-belt', BLACKGLASSES: 'black-glasses',
  PINK_BOW: 'pink-bow', NEVERMELTICE: 'never-melt-ice',
  SILK_SCARF: 'silk-scarf', SHINY_STONE: 'shiny-stone'
}


void SPECIAL
const result: Record<number, string> = {}
const unresolved: string[] = []
for (const { id, name } of gen2) {
  let ident = name.toLowerCase().replace(/_/g, '-')
  const probe = SPECIAL[name] ?? ident
  let zh = identToZh[probe]
  if (!zh) {
    // 尝试去掉后缀数字/变体
    zh = identToZh[probe.replace(/-\d+$/, '')] ?? ''
  }
  const MANUAL: Record<number, string> = {
    0: '（无）', 7: '自行车', 51: '能力防守（X防御）', 53: '能力特攻（X特攻）',
    55: '寻宝仪', 67: '神秘药水（剧情）', 74: '解毒树果', 78: '解麻树果',
    79: '解灼伤树果', 80: '解冻树果', 83: '解混乱树果', 84: '解睡眠树果',
    101: '粉色球果', 104: '粉红蝴蝶结', 109: '神奇树果', 114: '愤怒馒头',
    150: '神奇树果（PP）', 152: '狂暴基因', 158: '花之邮件', 167: '普通盒子',
    168: '华丽盒子', 170: '波点蝴蝶结', 173: '树果', 174: '黄金树果',
    175: '洒水壶（剧情）', 180: '砖块碎片', 181: '冲浪邮件', 182: '淡蓝邮件',
    183: '肖像邮件', 184: '可爱邮件', 190: '渐蓝邮件', 191: '木天蓼邮件',
    192: '芳香邮件'
  }
  if (zh) result[id] = zh
  else if (MANUAL[id]) result[id] = MANUAL[id]
  else if (/^ITEM_/.test(name)) result[id] = '未使用'
  else if (/MAIL$/.test(name)) result[id] = '邮件'
  else unresolved.push(name + '(0x' + id.toString(16) + ')')
}
fs.writeFileSync('src/core/gen2-items-zh.json', JSON.stringify(result))
console.log('已解析:', Object.keys(result).length, '/', gen2.length)
console.log('未解析:', unresolved.slice(0, 30).join(', '))
