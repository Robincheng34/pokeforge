/**
 * 用真实 ROM 校验各 GameProfile 的表偏移
 */
import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { parseHeader, identifyGame, scanForGen } from '../src/core/detect'
import { PROFILES, verifyProfile, readSpeciesTable, readMovesTable, type GameProfile } from '../src/core/profiles'

const SAMPLES: Array<[string, string]> = [
  ['红 (Gen1)', 'F:/新建文件夹 (2)/Pokémon/Game Boy/Pokémon-Red.gbc'],
  ['皮卡丘 (Gen1 黄)', 'F:/新建文件夹 (2)/Pokémon/Game Boy/Pokémon-Pika.gbc'],
  ['蓝 (Gen1)', 'F:/新建文件夹 (2)/Pokémon/Game Boy/Pokémon-Blue.gbc'],
  ['金 (Gen2)', 'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc'],
  ['银 (Gen2)', 'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc'],
  ['水晶 (Gen2 简体汉化)', 'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc'],
  ['银 (Gen2 汉化 Tom_C)', 'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'],
  ['火红 (Gen3)', 'F:/新建文件夹 (2)/Pokémon/Game Boy Advance/Pokémon-FireRed.gba'],
  ['叶绿 (Gen3)', 'F:/新建文件夹 (2)/Pokémon/Game Boy Advance/Pokémon-LeafGreen.gba']
]

function resolveProfile(data: Buffer, gameId: string | null): { profile: GameProfile; source: string } | null {
  if (gameId && PROFILES[gameId]) {
    const rom = new Rom(data, data[0xb2] === 0x96 ? 'gba' : 'gb')
    if (verifyProfile(rom, PROFILES[gameId])) return { profile: PROFILES[gameId], source: '按 title 识别' }
  }
  const scan = scanForGen(data)
  if (!scan) return null
  const base = scan.gen === 2 ? PROFILES.silver : scan.gen === 1 ? PROFILES.red : PROFILES.firered
  // gen1 无 0 号条目，offset=表首=Bulbasaur；gen2/gen3 有 0 号条目，offset=Bulbasaur-entrySize
  const entrySize = scan.gen === 2 ? 32 : 28
  const tableOffset = scan.gen === 1 ? scan.bulbasaurOffset : scan.bulbasaurOffset - entrySize
  const patched: GameProfile = {
    ...base,
    id: base.id + '-patched',
    baseStats: { ...base.baseStats, offset: tableOffset, verify: undefined },
    moves: undefined
  }
  return { profile: patched, source: `签名扫描 gen${scan.gen} Bulbasaur@0x${scan.bulbasaurOffset.toString(16)}` }
}

for (const [label, path] of SAMPLES) {
  console.log(`\n=== ${label} ===`)
  if (!fs.existsSync(path)) { console.log('  文件不存在，跳过'); continue }
  const data = fs.readFileSync(path)
  const h = parseHeader(data)
  const game = identifyGame(h)
  console.log(`  header: platform=${h.platform} title="${h.title}" gameCode=${h.gameCode ?? '-'}`)
  const resolved = resolveProfile(data, game?.id ?? null)
  if (!resolved) { console.log('  ❌ 无法定位数据表'); continue }
  const { profile, source } = resolved
  console.log(`  profile: ${source}`)
  const rom = new Rom(data, h.platform)
  const species = readSpeciesTable(rom, profile.baseStats)
  const byId = (id: number) => species.find((s) => s.index === id)
  const bulba = byId(1)
  if (!bulba) { console.log('  ❌ 读取 Bulbasaur 失败'); continue }
  const st = bulba.values
  console.log(`  Bulbasaur -> ${st.hp === 45 ? 'OK' : 'FAIL'} HP=${st.hp} ATK=${st.atk} DEF=${st.def} ${st.spd !== undefined ? 'SPD=' + st.spd : 'SpA=' + st.spAtk + ' SpD=' + st.spDef} 捕获率=${st.catchRate}`)
  const pika = byId(25)
  if (pika) console.log(`  Pikachu   -> ${pika.values.hp === 35 ? 'OK' : 'FAIL'} HP=${pika.values.hp} ATK=${pika.values.atk}`)
  if (profile.moves) {
    const moves = readMovesTable(rom, profile.moves)
    const pound = moves.find((m) => m.index === 1)
    if (pound) console.log(`  Pound     -> ${pound.values.power === 40 ? 'OK' : 'FAIL'} 威力=${pound.values.power} PP=${pound.values.pp}`)
  }
}
