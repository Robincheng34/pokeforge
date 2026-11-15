import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { findMartsPointerTable, readMart, itemLabel } from '../src/core/marts'
for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'
]) {
  const rom = new Rom(fs.readFileSync(f), 'gb')
  const t = findMartsPointerTable(rom)
  if (!t) { console.log(f.split('/').pop(), '-> 未定位'); continue }
  let ok = 0
  const first = readMart(rom, t.tableOffset, 0x05, 0)
  for (let i = 0; i < t.count; i++) if (readMart(rom, t.tableOffset, 0x05, i)) ok++
  console.log(f.split('/').pop(), '->', t.count, '家店 @0x' + t.tableOffset.toString(16), `全部可解析: ${ok}/${t.count}`, '| 吉花:', first?.items.map((it) => it.item).join(', '))
}
