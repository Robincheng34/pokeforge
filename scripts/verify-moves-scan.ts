import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { resolveMovesTable, readMovesTable, PROFILES } from '../src/core/profiles'

for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'
]) {
  const rom = new Rom(fs.readFileSync(f), 'gb')
  const off = resolveMovesTable(rom)
  if (off === null) { console.log(f.split('/').pop(), '-> 未定位'); continue }
  const moves = readMovesTable(rom, { offset: off, entrySize: 7, count: 254, firstId: 1, fields: PROFILES.silver.moves!.fields })
  const pound = moves.find((m) => m.index === 1)!
  const fireBlast = moves.find((m) => m.index === 126)! // 大字爆炎 id 126?
  console.log(f.split('/').pop(), '-> 0x' + off.toString(16), `Pound: 威力${pound.values.power} PP${pound.values.pp}`)
}
