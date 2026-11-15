import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { readTrainerGroup } from '../src/core/trainers'
import { readTrainerGroupPointerTable } from '../src/core/locations'

const data = fs.readFileSync('F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc')
const rom = new Rom(data, 'gb')
const ptrTable = readTrainerGroupPointerTable(rom)
const rosters = JSON.parse(fs.readFileSync('src/core/gym-rosters.json', 'utf8'))
for (const gym of rosters.slice(0, 4)) {
  console.log(`\n${gym.cn}:`)
  for (const r of gym.roster) {
    const gref = ptrTable[r.group - 1]
    if (!gref) { console.log(`  组${r.group}#${r.id}: 指针越界`); continue }
    const gd = readTrainerGroup(rom, { label: 'g' + r.group, bank: gref.bank, addr: gref.addr }, 30)
    const entry = gd.trainers[r.id - 1]
    console.log(`  ${r.label} (组${r.group}#${r.id}): ${entry ? entry.mons.map((m) => `lv${m.level}#${m.species}`).join(' ') : '(无)'}`)
  }
}
