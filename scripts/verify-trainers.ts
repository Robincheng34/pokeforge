import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { TRAINER_GROUPS, readTrainerGroup } from '../src/core/trainers'

const data = fs.readFileSync('F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc')
const rom = new Rom(data, 'gb')
const sorted = [...TRAINER_GROUPS].sort((a, b) => a.bank * 0x10000 + a.addr - (b.bank * 0x10000 + b.addr))

for (const name of ['FalknerGroup', 'WhitneyGroup', 'RedGroup', 'GruntMGroup', 'Rival1Group']) {
  const g = TRAINER_GROUPS.find((x) => x.label === name)!
  const idx = sorted.findIndex((x) => x.label === name)
  const next = sorted[idx + 1]
  const end = next && next.bank === g.bank ? next.bank * 0x4000 + (next.addr - 0x4000) : rom.size
  const d = readTrainerGroup(rom, g, 40, end)
  const first = d.trainers[0]
  console.log(name, d.trainers.length, '人; 第1人:', first ? first.mons.map((m) => `lv${m.level}#${m.species}`).join(' ') : '无')
}
