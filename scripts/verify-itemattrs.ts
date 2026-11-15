import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { findItemAttrTable, readItemAttr } from '../src/core/itemattrs'
for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'
]) {
  const rom = new Rom(fs.readFileSync(f), 'gb')
  const t = findItemAttrTable(rom)
  if (t === null) { console.log(f.split('/').pop(), '未定位'); continue }
  const ultra = readItemAttr(rom, t, 2)
  const potion = readItemAttr(rom, t, 18)
  console.log(f.split('/').pop(), '@0x' + t.toString(16),
    `高级球: 价格${ultra.price} 口袋${ultra.pocket} ${ultra.price === 1200 && ultra.pocket === 3 ? 'OK' : 'FAIL'}`,
    `药水: 价格${potion.price} ${potion.price === 300 ? 'OK' : 'FAIL'}`)
}
