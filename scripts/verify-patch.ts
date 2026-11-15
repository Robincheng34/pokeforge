import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { findTMCompatCheck, setTMCompatIgnored, isTMCompatPatched } from '../src/core/trainers'

for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'
]) {
  const rom = new Rom(fs.readFileSync(f), 'gb')
  const off = findTMCompatCheck(rom)
  if (off === null) { console.log(f.split('/').pop(), '-> 未找到例程'); continue }
  setTMCompatIgnored(rom, off, true)
  const patched = isTMCompatPatched(rom, off)
  const bytes = Array.from({ length: 12 }, (_, k) => rom.readU8(off + k).toString(16).padStart(2, '0')).join(' ')
  rom.revertAll()
  const restored = !isTMCompatPatched(rom, off)
  console.log(f.split('/').pop(), '@0x' + off.toString(16), '补丁:', patched ? 'OK' : 'FAIL', '复原:', restored ? 'OK' : 'FAIL')
}
