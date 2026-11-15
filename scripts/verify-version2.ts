import * as fs from 'fs'
import { parseHeader, detectVersion } from '../src/core/detect'
for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/精灵宝可梦-水晶版/Pokemon_Crystal[T+Chi](V1.2).gbc',
]) {
  const data = fs.readFileSync(f)
  const h = parseHeader(data)
  const v = detectVersion(data, h)
  console.log(f.split('/').pop(), '->', v.id, '|', v.verdict, `(${v.confidence})`)
}
