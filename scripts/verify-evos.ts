import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { resolveEvosTable, readEvosEntryFor } from '../src/core/evos'
import { moveName } from '../src/core/names'

for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'
]) {
  const rom = new Rom(fs.readFileSync(f), 'gb')
  const t = resolveEvosTable(rom)
  if (!t) { console.log(f.split('/').pop(), '-> 未定位'); continue }
  const bulba = readEvosEntryFor(rom, t, 1)
  const pikachu = readEvosEntryFor(rom, t, 25)
  console.log(f.split('/').pop(), `-> 表@0x${t.tableOffset.toString(16)} bank${t.bank} ${t.count}项`)
  console.log('  妙蛙种子:', bulba ? `${bulba.evolutions.map((e) => e.text).join('; ')} | ${bulba.learns.map((l) => `lv${l.level}:${moveName(l.move)}`).join(' ')}` : '解析失败')
  console.log('  皮卡丘:', pikachu ? `${pikachu.evolutions.map((e) => e.text).join('; ')} | ${pikachu.learns.slice(0, 6).map((l) => `lv${l.level}:${moveName(l.move)}`).join(' ')}` : '解析失败')
}
