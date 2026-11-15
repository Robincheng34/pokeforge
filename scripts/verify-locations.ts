import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { MAP_SCRIPTS, getLocationEnd, scanLoadTrainers, readTrainerGroupPointerTable } from '../src/core/locations'
import { readTrainerGroup } from '../src/core/trainers'

const data = fs.readFileSync('F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc')
const rom = new Rom(data, 'gb')
const ptrTable = readTrainerGroupPointerTable(rom)
console.log('分组指针表条目:', ptrTable.length)

for (const gymLabel of ['VioletGym', 'AzaleaGym', 'GoldenrodGym', 'EcruteakGym', 'BlackthornGym1F']) {
  const m = MAP_SCRIPTS.find((x) => x.label === gymLabel)!
  const end = getLocationEnd(MAP_SCRIPTS, m, rom.size)
  const hits = scanLoadTrainers(rom, m, end, ptrTable.length)
  console.log(`\n${gymLabel} (bank ${m.bank} @0x${(m.bank * 0x4000 + m.addr - 0x4000).toString(16)}): ${hits.length} 个 loadtrainer`)
  for (const h of hits) {
    const gref = ptrTable[h.groupIndex]
    if (!gref) continue
    const gd = readTrainerGroup(rom, { label: 'g' + h.groupIndex, bank: gref.bank, addr: gref.addr }, 20)
    const entry = gd.trainers[h.trainerId - 1]
    const party = entry ? entry.mons.map((m2) => `lv${m2.level}#${m2.species}`).join(' ') : '(解析失败)'
    console.log(`  组${h.groupIndex} 第${h.trainerId}人: ${party}`)
  }
}
