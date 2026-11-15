import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { findItemEffectsTable, readItemEffectsEntries } from '../src/core/itemeffects'

for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/精灵宝可梦-水晶版/Pokemon_Crystal[T+Chi](V1.2).gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'
]) {
  const rom = new Rom(fs.readFileSync(f), 'gb')
  const t = findItemEffectsTable(rom)
  if (!t) { console.log(f.split('/').pop(), '-> 未定位'); continue }
  const entries = readItemEffectsEntries(rom, t)
  // 抽验: id1 与 id2 应为同一例程(精灵球效果), id50(神奇糖果) 与 id1 不同
  const e1 = entries[0], e2 = entries[1], e50 = entries[49]
  console.log(f.split('/').pop(), '-> 表@0x' + t.offset.toString(16), 'bank' + t.bank,
    `e1=e2(精灵球效果): ${e1.ptr === e2.ptr ? 'OK' : 'FAIL'}`,
    `e50(神奇糖果)=0x${e50.ptr.toString(16)}`,
    `可用效果例程: ${t.addrLabel.size} 种`)
}
