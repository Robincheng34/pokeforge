import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { getWildTables, readGrassWildTable } from '../src/core/wild'
for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'
]) {
  const rom = new Rom(fs.readFileSync(f), 'gb')
  const { grass, delta } = getWildTables(rom)
  const s = readGrassWildTable(rom, grass[0])
  console.log(f.split('/').pop(), 'delta=+0x' + delta.toString(16), '喇叭芽2F:', s.slots.slice(0, 7).map((x) => `lv${x.level}#${x.species}`).join(' '))
}
