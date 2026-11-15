import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { resolveTrainerGroups, readTrainerGroup } from '../src/core/trainers'

for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc'
]) {
  const rom = new Rom(fs.readFileSync(f), 'gb')
  const groups = resolveTrainerGroups(rom)
  const falkner = groups.find((g) => g.num === 1)
  const d = falkner ? readTrainerGroup(rom, falkner, 5) : null
  const party = d?.trainers[0]?.mons.map((m) => `lv${m.level}#${m.species}`).join(' ')
  console.log(f.split('/').pop(), '->', groups.length, '组; Falkner:', party ?? '无')
}
